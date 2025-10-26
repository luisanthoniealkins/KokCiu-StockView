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

#[derive(Deserialize)]
struct ProductQuery {
    search: Option<String>,
    category: Option<String>,
    sort_by: Option<String>,
    sort_dir: Option<String>,
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
}
pub const DB_DIR: &str = "/data";
pub const DB_PATH: &str = "/data/database.sqlite";

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
        let quantity: i64 = record[7].parse()?;
        
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
        debug!("{} {} {} {} {} {} {} {}", code, name, brand, car_type, price, price_code, date, quantity);
        a += 1;
        if a == 20 {
            break;
        }
    }

    let mut locked = state.data.lock().unwrap();
    *locked = products.clone();

    Ok(products)
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
    let mut locked = state.data.lock().unwrap();
    *locked = products.clone();

    Ok(products)
}

#[tauri::command]
async fn export_db_file(state: tauri::State<'_, AppState>) -> Result<String, CommandError> {
    fs::create_dir_all(DB_DIR)?;
    fs::remove_file(DB_PATH)?;

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

fn set_filter() { // param: Filter Query
    // add filtering condition
    // search per category
    // order by category | asc or desc

    // return value (by filter)
}


#[tokio::main]
async fn main() {
    // let db_path = PathBuf::from("../data/database.sqlite");

    // if let Some(parent) = db_path.parent() {
    //     std::fs::create_dir_all(parent).unwrap();
    // }

    // let db_url = format!("sqlite://{}", db_path.display());
    // let pool = SqlitePool::connect(&db_url)
    //     .await
    //     .expect("Failed to connect to database");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(dialog_init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Stdout)) // Logs to the terminal
                .build(),
        )
        // .manage(pool)
        .manage(AppState{
            data: Mutex::new(vec![]),
        })
        .invoke_handler(tauri::generate_handler![
            load_excel_file,
            load_db_file,
            export_db_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    debug!("Hello");
}
