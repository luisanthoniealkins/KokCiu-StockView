import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


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
  const [search, setSearch] = useState("");

  async function loadProducts() {
    const result = await invoke<Product[]>("load_db_file");
    setProducts(result);
  }

  async function handleLoadExcel() {
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

  async function handleExportDB() {
    await invoke<string>("export_db_file")
      .then((message) => toast.success(message))
      .catch((error) => toast.error(error));
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">StockView</h1>
        <div className="space-x-3">
          <Button onClick={handleLoadExcel}>Load From Excel</Button>
          <Button variant="secondary" onClick={handleExportDB}>Export to DB</Button>
        </div>
      </header>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Items</h2>
          <Input
            placeholder="Search..."
            className="w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="w-full text-sm text-left border-t">
          <thead className="bg-gray-100 text-gray-700 font-medium">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Car Type</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{item.code}</td>
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2">{item.brand}</td>
                <td className="px-4 py-2">{item.car_type}</td>
                <td className="px-4 py-2">{item.price}</td>
                <td className="px-4 py-2">{item.date}</td>
                <td className="px-4 py-2">{item.quantity}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    // <div style={{ padding: "2rem" }}>
    //   <h1>Product List</h1>
    //   <button onClick={handleOpenFile}>Load From Excel</button>
    //   <button onClick={exportToDB}>Export to DB</button>
    //   <button onClick={loadProducts}>Reload from DB</button>
    //   <button onClick={clearProducts}>Reset</button>

    //   <table border={1} cellPadding={8} style={{ marginTop: "1rem" }}>
    //     <thead>
    //       <tr>
    //         <th>Kode Barang</th>
    //         <th>Nama Barang</th>
    //         <th>Merek</th>
    //         <th>Tipe Mobil</th>
    //         <th>Harga</th>
    //         <th>Harga Beli Akhir</th>
    //         <th>Tanggal Beli Akhir</th>
    //         <th>Kuantitas</th>
    //       </tr>
    //     </thead>
    //     <tbody>
    //       {products.map((p) => (
    //         <tr key={p.id}>
    //           <td>{p.code}</td>
    //           <td>{p.name}</td>
    //           <td>{p.brand}</td>
    //           <td>{p.car_type}</td>
    //           <td>{p.price}</td>
    //           <td>{p.price_code}</td>
    //           <td>{p.date}</td>
    //           <td>{p.quantity}</td>
    //         </tr>
    //       ))}
    //     </tbody>
    //   </table>
    // </div>
  );
}

export default App;