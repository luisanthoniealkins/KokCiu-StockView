import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVirtualizer } from "@tanstack/react-virtual";
// import MyTable from "./MyTable";

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
  const [productCount, setProductCount] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortState, setSortState] = useState<SortState>({
    column: "code",
    direction: "asc",
  });
  const [filters, setFilters] = useState({
    code: "",
    name: "",
    brand: "",
    car_type: "",
    price: "",
    price_code: "",
    date: "",
    quantity: "",
  });
  const [cols, setCols] = useState<Product>({
      id: 0,
      code: "",
      name: "",
      brand: "",
      car_type: "",
      price: 0,
      price_code: "",
      date: "",
      quantity: 0,
  });
  const [gridTemplate, setGridTemplate] = useState<string>(
    "auto auto 1fr auto auto auto auto auto auto"
  );
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const lastEscTime = useRef(0);

  async function handleRefresh() {
    await invoke<Product[]>("load_db_file")
      .then((result) => {
        setProducts(result);
        toast.success("Refresh sukses");
      })
      .catch((error) => {
        toast.error(error)
      });

    invoke<Product>("get_product_cols")
      .then((result) => { setCols(result); })
      .catch((error) => { toast.error(error) });

    invoke<number>("get_product_count")
      .then((result) => { setProductCount(result); })
      .catch((error) => { toast.error(error) });
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
        });
      
      invoke<Product>("get_product_cols")
        .then((result) => { setCols(result); })
        .catch((error) => { toast.error(error) });

      invoke<number>("get_product_count")
        .then((result) => { setProductCount(result); })
        .catch((error) => { toast.error(error) });
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
    const timeoutId = setTimeout(() => {
      console.log("Sort State: ", sortState);
      console.log("Filters: ", filters);
      refreshProduct();
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [sortState, filters]);

  async function refreshProduct() {
    const result = await invoke<Product[]>("set_table_state", {sortState: sortState, filters: filters});
    setProducts(result);

    invoke<Product>("get_product_cols")
      .then((result) => { setCols(result); })
      .catch((error) => { toast.error(error) });

    invoke<number>("get_product_count")
      .then((result) => { setProductCount(result); })
      .catch((error) => { toast.error(error) });
  };

  const clearFilter = () => {
    setFilters(
      {
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

  useEffect(() => {
    const temp = document.createElement("div");
    temp.className ="invisible fixed top-0 left-0 grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] text-sm";
    // temp.className ="fixed top-0 left-0 grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] text-sm";
    document.body.appendChild(temp);

    const widths = new Array(9).fill(0);
    
    {
      const row = document.createElement("div");
      row.className = "contents"; // each child stays in grid context

      const values = [
        cols.id,
        cols.code,
        cols.name,
        cols.brand,
        cols.car_type,
        cols.price,
        cols.price_code,
        cols.date,
        cols.quantity,
      ];

      values.forEach((v, _) => {
        const cell = document.createElement("div");
        cell.textContent = String(v);
        cell.className = "px-4 py-2 whitespace-nowrap border text-[14px]";
        row.appendChild(cell);
      });
      temp.appendChild(row);
    }

    {
      const row = document.createElement("div");
      row.className = "contents"; // each child stays in grid context

      const values = [
        headersTitle[headersCode[0]],
        headersTitle[headersCode[1]],
        headersTitle[headersCode[2]],
        headersTitle[headersCode[3]],
        headersTitle[headersCode[4]],
        headersTitle[headersCode[5]],
        headersTitle[headersCode[6]],
        headersTitle[headersCode[7]],
        headersTitle[headersCode[8]],
      ];

      values.forEach((v, i) => {
        const cell = document.createElement("div");
        cell.textContent = String(v);
        if (i === 0) cell.className = "px-4 py-2 whitespace-nowrap border text-[16px]";
        else cell.className = "px-4 py-2 pe-10 whitespace-nowrap border text-[16px]";
        row.appendChild(cell);
      });
      temp.appendChild(row);
    }
    
    const minWidth = [0, 120, 120, 120, 120, 120, 120, 120, 120];
    for (let i = 0; i < 9; i++) {
      widths[i] = Math.max(minWidth[i], temp.children[0].children[i].getBoundingClientRect().width);
    }
  
    temp.remove();

    const gridTemplate = widths
      .map((w, i) => {
        if (i === 2) return "1fr";
        return `${w}px`;
      })
      .join(" ")

    setGridTemplate(gridTemplate);
  }, [cols]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const now = Date.now();

        // Check if pressed twice within 400ms
        if (now - lastEscTime.current < 400) {
          // ✅ Put your function here
          console.log("Double ESC detected!");
          handleDoubleEsc();
        }

        // Update last press time
        lastEscTime.current = now;
      }
    };

    // Listen globally
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDoubleEsc = () => {
    clearFilter();
  };

  return (
    <div className="p-6 max-w-screen mx-auto flex flex-col h-screen">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">📦 StockView</h1>
        <div className="flex gap-2">
          <Button onClick={handleLoadExcel} tabIndex={-1} className="bg-emerald-600 hover:bg-emerald-500 text-white">Load Excel</Button>
          <Button onClick={handleExportDB} tabIndex={-1} className="bg-blue-600 hover:bg-blue-500 text-white">Export DB</Button>
          <Button onClick={handleRefresh} tabIndex={-1}>Refresh DB</Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col border rounded-md bg-white shadow-sm overflow-hidden">
      
        {/* Top controls (not scrollable) */}
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Items</span>
            <span className="bg-slate-200 px-2 py-0.5 rounded-md">{productCount}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-gray-700">Filtered</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">{products.length}</span>
          </div>
          <Button onClick={clearFilter} tabIndex={-1}>Clear Filter</Button>
        </div>

        {/* Column header row (not scrollable) */}
        <div
          //className="grid border-b bg-gray-100 text-sm font-medium text-gray-600 pe-4"
          className="grid bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 border-b border-slate-700 pe-4"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {headersCode.map((col) => (
            <div
              key={col}
              onClick={() => handleSort(col)}
              className={`px-4 py-2 cursor-pointer select-none ${
                col === "id" ? "pointer-events-none" : "hover:bg-slate-700"
              }`}
            >
              <div className="flex justify-between items-center">
                {headersTitle[col]}
                {sortState.column === col && (
                  <span>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Filter inputs row (not scrollable) */}
        <div
          className="grid border-b bg-slate-100 pe-4"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {headersCode.map((key) =>
            key === "id" ? (
              <div key={key} className="border p-1 bg-slate-100" />
            ) : (
              <div key={key} className="border p-1 bg-slate-100">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={filters[key]}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            )
          )}
        </div>

        {/* Scrollable TableBody */}
        <div className="flex-1 overflow-auto overflow-y-scroll" tabIndex={-1} ref={parentRef} style={{ contain: "strict" }}>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const product = products[virtualRow.index];
              return (
                <div
                  key={product.id}
                  className="absolute left-0 right-0 grid text-sm text-slate-800 hover:bg-slate-200 border-b border-gray-100 transition-colors"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: gridTemplate,
                  }}
                >
                  <div className="px-4 py-2 truncate border-r text-center">{product.id}</div>
                  <div className="px-4 py-2 truncate border-r" title={product.code}>{product.code}</div>
                  <div className="px-4 py-2 truncate border-r" title={product.name}>{product.name}</div>
                  <div className="px-4 py-2 truncate border-r" title={product.brand}>{product.brand}</div>
                  <div className="px-4 py-2 truncate border-r" title={product.car_type}>{product.car_type}</div>
                  <div className="px-4 py-2 truncate border-r text-right" title={product.price.toString()}>{product.price}</div>
                  <div className="px-4 py-2 truncate border-r" title={product.price_code}>{product.price_code}</div>
                  <div className="px-4 py-2 truncate border-r text-center" title={product.date}>{product.date}</div>
                  <div className="px-4 py-2 truncate border-r text-right" title={product.quantity.toString()}>{product.quantity}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

}

export default App;