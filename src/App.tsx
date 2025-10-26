import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";

// interface ProductQuery {
//   search?: string;
//   category?: string;
//   sort_by?: "name" | "price";
//   sort_dir?: "asc" | "desc";
// }

interface Product {
  id: number;
  code: string;
  name: string;
  brand: string;
  car_type: string;
  price: number;
  price_code: string;
  date: string;
  quantity: number;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);

  async function loadProducts() {
    const result = await invoke<Product[]>("load_db_file");
    setProducts(result);
  }

  async function handleOpenFile() {
    const selected = await open({
      filters: [{ name: "Excel", extensions: ["csv"] }],
    });

    if (selected) {
      const result = await invoke<Product[]>("load_excel_file", { path: selected });
      setProducts(result);
    }
  }

  function clearProducts() {
    setProducts([])
  }

  async function exportToDB() {
    await invoke<string>("export_db_file")
      .then((message) => toast.success(message))
      .catch((error) => toast.error(error));
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Product List</h1>
      <button onClick={handleOpenFile}>Load From Excel</button>
      <button onClick={exportToDB}>Export to DB</button>
      <button onClick={loadProducts}>Reload from DB</button>
      <button onClick={clearProducts}>Reset</button>

      <table border={1} cellPadding={8} style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Kode Barang</th>
            <th>Nama Barang</th>
            <th>Merek</th>
            <th>Tipe Mobil</th>
            <th>Harga</th>
            <th>Harga Beli Akhir</th>
            <th>Tanggal Beli Akhir</th>
            <th>Kuantitas</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.code}</td>
              <td>{p.name}</td>
              <td>{p.brand}</td>
              <td>{p.car_type}</td>
              <td>{p.price}</td>
              <td>{p.price_code}</td>
              <td>{p.date}</td>
              <td>{p.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;