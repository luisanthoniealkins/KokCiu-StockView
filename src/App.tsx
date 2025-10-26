import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


// interface ProductQuery {
//   sort_by: string;
//   sort_dir: "asc" | "desc";
// }

type SortDirection = "asc" | "desc";
interface SortState {
  column: string;
  direction: SortDirection;
}

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

const headersCode = [
  "id",
  "code",
  "name",
  "brand",
  "car_type",
  "price",
  "price_code",
  "date",
  "quantity",
] as const

const headersTitle = {
  "id"        : "NO",
  "code"      : "KODE BARANG",
  "name"      : "NAMA BARANG",
  "brand"     : "MEREK",
  "car_type"  : "TIPE MOBIL",
  "price"     : "PRICELIST",
  "price_code": "HB AKHIR",
  "date"      : "TB AKHIR",
  "quantity"  : "QTY",
} as const;

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sortState, setSortState] = useState<SortState>({
    column: "id",
    direction: "asc",
  });
  const [filters, setFilters] = useState({
    id: "",
    code: "",
    name: "",
    brand: "",
    car_type: "",
    price: "",
    price_code: "",
    date: "",
    quantity: "",
  });

  async function handleRefresh() {
    await invoke<Product[]>("load_db_file")
      .then((result) => {
        setProducts(result);
        toast.success("Refresh sukses");
      })
      .catch((error) => {
        toast.error(error)
      });
  };

  async function handleLoadExcel() {
    const selected = await open({
      filters: [{ name: "Excel", extensions: ["csv"] }],
    });

    if (selected) {
      await invoke<Product[]>("load_excel_file", { path: selected })
        .then((result) => {
          setProducts(result);
          toast.success("Load sukses");
        })
        .catch((error) => {
          toast.error(error)
        })
    }
  };

  async function handleExportDB() {
    await invoke<string>("export_db_file")
      .then((message) => toast.success(message))
      .catch((error) => toast.error(error));
  };

  const handleSort = (column: string) => {
    setSortState((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    console.log("Sort State: ", sortState);
    console.log("Filters: ", filters);
    refreshProduct();
  }, [sortState, filters])

  async function refreshProduct() {
    const result = await invoke<Product[]>("set_table_state", {sortState: sortState, filters: filters});
    setProducts(result);
  };

  const clearFilter = () => {
    setFilters(
      {
        id: "",
        code: "",
        name: "",
        brand: "",
        car_type: "",
        price: "",
        price_code: "",
        date: "",
        quantity: "",
      }
    )
  };

  return (
    <div className="p-6 max-w-screen mx-auto flex flex-col h-screen">
      {/* Header: Title, General Operation (Load Excel, Export DB, Refresh DB) */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">StockView</h1>
        <div className="  ">
          <Button onClick={handleLoadExcel}>Load dari Excel</Button>
          <Button variant="secondary" onClick={handleExportDB}>Export ke DB</Button>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      </header>

      {/* Body: Table, Table-Related Operation (Search, Sort, Pagination) */}
      <div className="flex-1 overflow-hidden p-4 h-full flex flex-col">
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Items</h2>
          <Button onClick={clearFilter}>Hapus Filter</Button>
        </div>

        <div className="bg-gray-50 border-t">
          <div className="flex">
            {headersCode.map((col) => (
              <div
                key={col}
                onClick={() => handleSort(col)}
                className="w-1/3 cursor-pointer select-none px-4 py-2 hover:bg-blue-200"
              >
                <div className="flex items-center gap-1 justify-between">
                  {headersTitle[col]}
                  {sortState.column === col && (
                    <span>
                      {sortState.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex">
            {headersCode.map((key) => (
              <div key={key} className="border p-1 bg-gray-50">
                <Input
                  type="text"
                  placeholder={`Search ${key}`}
                  value={filters[key as keyof typeof filters]}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Table container takes full remaining height */}
        <div className="flex-1 overflow-y-auto">
          {products.map((item) => (
            <div key={item.id} className="flex border-t hover:bg-gray-50">
              <div className="w-1/3 px-4 py-2">{item.id}</div>
              <div className="w-1/3 px-4 py-2">{item.code}</div>
              <div className="w-1/3 px-4 py-2">{item.name}</div>
              <div className="w-1/3 px-4 py-2">{item.brand}</div>
              <div className="w-1/3 px-4 py-2">{item.car_type}</div>
              <div className="w-1/3 px-4 py-2">{item.price}</div>
              <div className="w-1/3 px-4 py-2">{item.price_code}</div>
              <div className="w-1/3 px-4 py-2">{item.date}</div>
              <div className="w-1/3 px-4 py-2">{item.quantity}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    // <div className="flex flex-col h-screen">
    //   {/* Header bar (app toolbar, optional) */}
    //   <div className="p-4 bg-gray-100 border-b">
    //     <h1 className="text-lg font-bold">StockView</h1>
    //   </div>

      // {/* Table container takes full remaining height */}
      // <div className="flex-1 overflow-hidden p-4">
      //   <div className="border rounded-lg h-full flex flex-col">
      //     {/* Table header stays fixed */}
      //     <div className="bg-gray-50 border-b flex">
      //       <div className="w-1/3 p-2 font-semibold">Item</div>
      //       <div className="w-1/3 p-2 font-semibold">Quantity</div>
      //       <div className="w-1/3 p-2 font-semibold">Price</div>
      //     </div>

      //     {/* Table body scrollable */}
      //     <div className="flex-1 overflow-y-auto">
      //       {[...Array(100)].map((_, i) => (
      //         <div key={i} className="flex border-b hover:bg-gray-100">
      //           <div className="w-1/3 p-2">Apple #{i}</div>
      //           <div className="w-1/3 p-2">{Math.floor(Math.random() * 50)}</div>
      //           <div className="w-1/3 p-2">${(Math.random() * 100).toFixed(2)}</div>
      //         </div>
      //       ))}
      //     </div>
      //   </div>
    //   </div>
    // </div>
  );
}

export default App;