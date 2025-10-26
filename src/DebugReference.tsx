// import { useState, useEffect, useMemo } from "react";
// import { invoke } from "@tauri-apps/api/core";
// import { open } from "@tauri-apps/plugin-dialog";
// import toast from "react-hot-toast";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";


// // interface ProductQuery {
// //   search?: string;
// //   category?: string;
// //   sort_by?: "name" | "price";
// //   sort_dir?: "asc" | "desc";
// // }

// type SortDirection = "asc" | "desc";

// interface SortState {
//   column: string;
//   direction: SortDirection;
// }

// interface Product {
//   id: number;
//   code: string;
//   name: string;
//   brand: string;
//   car_type: string;
//   price: number;
//   price_code: string;
//   date: string;
//   quantity: number;
// }

// const headersCode = [
//   "id",
//   "code",
//   "name",
//   "brand",
//   "car_type",
//   "price",
//   "price_code",
//   "date",
//   "quantity",
// ] as const

// const headersTitle = {
//   "id"        : "NO",
//   "code"      : "KODE BARANG",
//   "name"      : "NAMA BARANG",
//   "brand"     : "MEREK",
//   "car_type"  : "TIPE MOBIL",
//   "price"     : "PRICELIST",
//   "price_code": "HB AKHIR",
//   "date"      : "TB AKHIR",
//   "quantity"  : "QTY",
// } as const;

// function App() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [search, setSearch] = useState("");

//   async function loadProducts() {
//     const result = await invoke<Product[]>("load_db_file");
//     setProducts(result);
//   }

//   async function handleLoadExcel() {
//     const selected = await open({
//       filters: [{ name: "Excel", extensions: ["csv"] }],
//     });

//     if (selected) {
//       const result = await invoke<Product[]>("load_excel_file", { path: selected });
//       setProducts(result);
//     }
//   }

//   function clearProducts() {
//     setProducts([])
//   }

//   async function handleExportDB() {
//     await invoke<string>("export_db_file")
//       .then((message) => toast.success(message))
//       .catch((error) => toast.error(error));
//   }

//   const filtered = products.filter(
//     (p) =>
//       p.name.toLowerCase().includes(search.toLowerCase()) ||
//       p.code.toLowerCase().includes(search.toLowerCase())
//   );

//     const [sortState, setSortState] = useState<SortState>({
//     column: "name",
//     direction: "asc",
//   });

//   // Sorting logic
//   const sortedData = [...products].sort((a, b) => {
//     const col = sortState.column as keyof Product;
//     const dir = sortState.direction === "asc" ? 1 : -1;
//     if (a[col] < b[col]) return -1 * dir;
//     if (a[col] > b[col]) return 1 * dir;
//     return 0;
//   });

//   const handleSort = (column: string) => {
//     console.log(column);
//     setSortState((prev) =>
//       prev.column === column
//         ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
//         : { column, direction: "asc" }
//     );
//   };

//   const [filters, setFilters] = useState({
//     code: "",
//     name: "",
//     brand: "",
//     car_type: "",
//     price: "",
//   });

//   const handleFilterChange = (key: string, value: string) => {
//     setFilters((prev) => ({ ...prev, [key]: value }));
//   };

//   const filteredData = useMemo(() => {
//     return products.filter((item) =>
//       Object.entries(filters).every(([key, value]) =>
//         item[key as keyof Product]
//           ?.toString()
//           .toLowerCase()
//           .includes(value.toLowerCase())
//       )
//     );
//   }, [products, filters]);

//  return (
//     <div className="p-6 max-w-7xl mx-auto">
//       <header className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold text-gray-800">StockView</h1>
//         <div className="space-x-3">
//           <Button onClick={handleLoadExcel}>Load From Excel</Button>
//           <Button variant="secondary" onClick={handleExportDB}>Export to DB</Button>
//         </div>
//       </header>

//       <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
//         <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
//           <h2 className="font-semibold text-gray-700">Items</h2>
//           <Input
//             placeholder="Search..."
//             className="w-60"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />
//         </div>

//         <table className="w-full text-sm text-left border-t">
//           <thead className="bg-gray-100 text-gray-700 font-medium">
//             <tr>
//               <th className="px-4 py-2">Code</th>
//               <th className="px-4 py-2">Name</th>
//               <th className="px-4 py-2">Brand</th>
//               <th className="px-4 py-2">Car Type</th>
//               <th className="px-4 py-2">Price</th>
//               <th className="px-4 py-2">Date</th>
//               <th className="px-4 py-2">Quantity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((item) => (
//               <tr key={item.id} className="border-t hover:bg-gray-50">
//                 <td className="px-4 py-2">{item.code}</td>
//                 <td className="px-4 py-2">{item.name}</td>
//                 <td className="px-4 py-2">{item.brand}</td>
//                 <td className="px-4 py-2">{item.car_type}</td>
//                 <td className="px-4 py-2">{item.price}</td>

//                 <td className="px-4 py-2">{item.date}</td>
//                 <td className="px-4 py-2">{item.quantity}</td>
//               </tr>
//             ))}
//             {filtered.length === 0 && (
//               <tr>
//                 <td colSpan={7} className="text-center py-6 text-gray-500">
//                   No data found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   )
// }

// export default App;