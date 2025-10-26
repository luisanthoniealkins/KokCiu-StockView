// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sqlx::{query, Row, SqlitePool, Executor, sqlite::SqlitePoolOptions, migrate::MigrateDatabase, Sqlite};
use std::num::ParseIntError;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{State, AppHandle};
use tauri_plugin_dialog::init as dialog_init;
use tauri_plugin_log::log::{debug, error, info, trace, warn};
use tauri_plugin_log::{Target, TargetKind};
use std::fs::File;
use thiserror::Error;
use std::io;
use std::path::Path;
use std::fs;
use itertools::Itertools;

// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum CommandError {
    #[error("CSV error: {0}")]
    Csv(#[from] csv::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("CSV error: {0}")] // TODO: change it
    ParseIntError(#[from] ParseIntError),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Database error: {0}")]
    SQLError(#[from] sqlx::Error),
}

// we must manually implement serde::Serialize
impl serde::Serialize for CommandError {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: serde::ser::Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
struct Product {
    id: i64,
    code: String,
    name: String,
    brand: String,
    car_type: String,
    price: i64,
    price_code: String,
    date: String,
    quantity: i64,
}

struct AppState {
    data: Mutex<Vec<Product>>,
    tableState: Mutex<SortState>,
    filter: Mutex<Filter>,
}

#[derive(Deserialize, Clone)]
struct SortState {
    column: String,
    direction: String,
}

#[derive(Deserialize, Clone)]
struct Filter {
    id: String,
    code: String,
    name: String,
    brand: String,
    car_type: String,
    price: String,
    price_code: String,
    date: String,
    quantity: String,
}

const DB_DIR: &str = "./data";
const DB_PATH: &str = "./data/database.sqlite";

#[tauri::command]
fn load_excel_file(path: String, state: State<AppState>) -> Result<Vec<Product>, CommandError> {
    // TODO: Remove
    debug!("{:?}", path);
    let file = File::open(path)?;
    let mut rdr = csv::Reader::from_reader(file);
    let mut products: Vec<Product> = Vec::new();

    let mut a = 0;

    for result in rdr.records() {
        let record = result?;

        let code = &record[0];
        let name = &record[1];
        let brand = &record[2];
        let car_type = &record[3];

        let price_text = &record[4].replace(",", "");
        let price: i64 = price_text.parse()?;
        
        let price_code = &record[5];
        let date = &record[6];

        let quantity_text = &record[7].replace(",", "");
        let quantity: i64 = quantity_text.parse()?;
        
        products.push(
            Product { 
                id: a, 
                code: code.to_string(), 
                name: name.to_string(), 
                brand: brand.to_string(),
                car_type: car_type.to_string(),
                price: price, 
                price_code: price_code.to_string(),
                date: date.to_string(),
                quantity: quantity,
            }
        );

        // TODO: Remove
        a += 1;
        if a == 50 {
            break;
        }
    }

    {
        let mut locked = state.data.lock().unwrap();
        *locked = products.clone();
    }

    Ok(get_filtered_products(&state))
}

#[tauri::command]
async fn load_db_file(state: State<'_, AppState>) -> Result<Vec<Product>, CommandError> {
    // Check if file exists
    if !Path::new(DB_PATH).exists() {
        return Err(CommandError::DatabaseError("Database file not found".to_string()));
    }

    // Connect to the SQLite database
    let pool = SqlitePool::connect(&format!("sqlite://{}", DB_PATH)).await?;

    // Try to load data
    let products: Vec<Product> = sqlx::query_as::<_, Product>(
        r#"
        SELECT 
            id, 
            code, 
            name, 
            brand, 
            car_type, 
            price, 
            price_code, 
            date, 
            quantity
        FROM stock_items
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|err| CommandError::DatabaseError(err.to_string()))?;

    // If no data found, return an empty error
    if products.is_empty() {
        return Err(CommandError::DatabaseError("".to_string()));
    }

    // Save to app state
    {
        let mut locked = state.data.lock().unwrap();
        *locked = products.clone();
    }

    Ok(get_filtered_products(&state))
}

#[tauri::command]
async fn export_db_file(state: tauri::State<'_, AppState>) -> Result<String, CommandError> {
    fs::create_dir_all(DB_DIR)?;

    let file_path = Path::new(DB_PATH);
    if file_path.exists() {
        fs::remove_file(file_path)?;
    }

    if !Sqlite::database_exists(DB_PATH).await? {
        println!("Creating database {}", DB_PATH);
        Sqlite::create_database(DB_PATH).await?;
        println!("Database created successfully.");
    } else {
        println!("Database already exists.");
    }

    // 1. Write to a new file
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(DB_PATH)
        .await?;

    // Clone data early and drop the lock before any await
    let data = {
        let guard = state.data.lock().unwrap();
        guard.clone()
    };

    // Create the table
    pool.execute(
        r#"
        CREATE TABLE stock_items (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            car_type TEXT NOT NULL,
            price INTEGER NOT NULL,
            price_code TEXT NOT NULL,
            date TEXT NOT NULL,
            quantity INTEGER NOT NULL
        );
        "#,
    )
    .await?;

    // Insert all records
    for product in data {
        sqlx::query(
            r#"
            INSERT INTO stock_items 
            (id, code, name, brand, car_type, price, price_code, date, quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(product.id)
        .bind(product.code)
        .bind(product.name)
        .bind(product.brand)
        .bind(product.car_type)
        .bind(product.price)
        .bind(product.price_code)
        .bind(product.date)
        .bind(product.quantity)
        .execute(&pool)
        .await?;
    }

    Ok("Database exported successfully!".to_string())
}

#[tauri::command]
async fn set_table_state(sort_state: SortState, filters: Filter, state: State<'_, AppState>) -> Result<Vec<Product>, CommandError> { 
    {
        let mut locked = state.tableState.lock().unwrap();
        *locked = sort_state.clone();

        let mut locked = state.filter.lock().unwrap();
        *locked = filters.clone();
    }

    Ok(get_filtered_products(&state))
}

fn get_filtered_products(state: &State<'_, AppState>) -> Vec<Product> {
    let products = {
        let guard = state.data.lock().unwrap();
        guard.clone()
    };

    let sort_state = {
        let guard = state.tableState.lock().unwrap();
        guard.clone()
    };

    let filters = {
        let guard = state.filter.lock().unwrap();
        guard.clone()
    };

    let mut sorted_products = products.iter()
    .filter(|p|
        (filters.id == "" || filters.id != "" && p.id.to_string().contains(&filters.id.to_uppercase())) && 
        (filters.code == "" || filters.code != "" && p.code.contains(&filters.code.to_uppercase())) && 
        (filters.name == "" || filters.name != "" && p.name.contains(&filters.name.to_uppercase())) && 
        (filters.brand == "" || filters.brand != "" && p.brand.contains(&filters.brand.to_uppercase())) && 
        (filters.car_type == "" || filters.car_type != "" && p.car_type.contains(&filters.car_type.to_uppercase())) && 
        (filters.price == "" || filters.price != "" && p.price.to_string().contains(&filters.price.to_uppercase())) && 
        (filters.price_code == "" || filters.price_code != "" && p.price_code.contains(&filters.price_code.to_uppercase())) && 
        (filters.date == "" || filters.date != "" && p.date.contains(&filters.date.to_uppercase())) && 
        (filters.quantity == "" || filters.quantity != "" && p.quantity.to_string().contains(&filters.quantity.to_uppercase())) 
    )
    .sorted_by(|a, b| 
        match sort_state.column.as_str() {
            "id" => a.id.cmp(&b.id),
            "code" => a.code.cmp(&b.code),
            "name" => a.name.cmp(&b.name),
            "brand" => a.brand.cmp(&b.brand),
            "car_type" => a.car_type.cmp(&b.car_type),
            "price" => a.price.cmp(&b.price),
            "price_code" => a.price_code.cmp(&b.price_code),
            "date" => a.date.cmp(&b.date),
            "quantity" => a.quantity.cmp(&b.quantity),
            _ => a.id.cmp(&b.id),
        }
    )
    .cloned()
    .collect::<Vec<_>>();

    if sort_state.direction.as_str() != "asc" {
        sorted_products.reverse();
    }

    return sorted_products
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(dialog_init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Stdout)) // Logs to the terminal
                .build(),
        )
        .manage(AppState{
            data: Mutex::new(vec![]),
            tableState: Mutex::new(
                SortState {
                    column: "id".to_string(),
                    direction: "asc".to_string(),
                }
            ),
            filter: Mutex::new(
                Filter { 
                    id: "".to_string(), 
                    code: "".to_string(), 
                    name: "".to_string(), 
                    brand: "".to_string(), 
                    car_type: "".to_string(), 
                    price: "".to_string(), 
                    price_code: "".to_string(), 
                    date: "".to_string(), 
                    quantity: "".to_string() 
                }
            )
        })
        .invoke_handler(tauri::generate_handler![
            load_excel_file,
            load_db_file,
            export_db_file,
            set_table_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    debug!("Hello");
}
