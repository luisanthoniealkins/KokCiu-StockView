import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVirtualizer } from "@tanstack/react-virtual";

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
] as const;

const headersTitle = {
  id: "NO",
  code: "KODE BARANG",
  name: "NAMA BARANG",
  brand: "MEREK",
  car_type: "TIPE MOBIL",
  price: "PRICELIST",
  price_code: "HB AKHIR",
  date: "TB AKHIR",
  quantity: "QTY",
} as const;

const ADMIN = true;

function App() {
  const [productCount, setProductCount] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortState, setSortState] = useState<SortState>({
    column: "id",
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
    "60px 120px 1fr 120px 120px 120px 120px 120px 80px",
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
        toast.error(error);
      });

    invoke<Product>("get_product_cols")
      .then((result) => {
        setCols(result);
      })
      .catch((error) => {
        toast.error(error);
      });

    invoke<number>("get_product_count")
      .then((result) => {
        setProductCount(result);
      })
      .catch((error) => {
        toast.error(error);
      });
  }

  async function handleLoadExcel() {
    const selected = await open({
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
    });

    if (selected) {
      await invoke<Product[]>("load_excel_file", { path: selected })
        .then((result) => {
          setProducts(result);
          toast.success("Load sukses");
        })
        .catch((error) => {
          toast.error(error);
        });

      invoke<Product>("get_product_cols")
        .then((result) => {
          setCols(result);
        })
        .catch((error) => {
          toast.error(error);
        });

      invoke<number>("get_product_count")
        .then((result) => {
          setProductCount(result);
        })
        .catch((error) => {
          toast.error(error);
        });
    }
  }

  async function handleExportDB() {
    await invoke<string>("export_db_file")
      .then((message) => toast.success(message))
      .catch((error) => toast.error(error));
  }

  const handleSort = (column: string) => {
    setSortState((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshProduct();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [sortState, filters]);

  async function refreshProduct() {
    const result = await invoke<Product[]>("set_table_state", {
      sortState: sortState,
      filters: filters,
    });
    setProducts(result);

    invoke<Product>("get_product_cols")
      .then((result) => {
        setCols(result);
      })
      .catch((error) => {
        toast.error(error);
      });

    invoke<number>("get_product_count")
      .then((result) => {
        setProductCount(result);
      })
      .catch((error) => {
        toast.error(error);
      });
  }

  const clearFilter = () => {
    setFilters({
      code: "",
      name: "",
      brand: "",
      car_type: "",
      price: "",
      price_code: "",
      date: "",
      quantity: "",
    });
  };

  const clearSorting = () => {
    setSortState({
      column: "id",
      direction: "asc",
    });
  };

  // Fixed auto-calculation engine to perfectly match table styling specs (px-2 py-2)
  useEffect(() => {
    const temp = document.createElement("div");
    temp.className =
      "invisible fixed top-0 left-0 grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] text-sm";
    document.body.appendChild(temp);

    const widths = new Array(9).fill(0);

    {
      const row = document.createElement("div");
      row.className = "contents";

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

      values.forEach((v) => {
        const cell = document.createElement("div");
        cell.textContent = String(v);
        cell.className = "px-2 py-2 whitespace-nowrap border text-sm";
        row.appendChild(cell);
      });
      temp.appendChild(row);
    }

    {
      const row = document.createElement("div");
      row.className = "contents";

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

      values.forEach((v) => {
        const cell = document.createElement("div");
        cell.textContent = String(v) + "  ▲";
        cell.className = "px-2 py-2 whitespace-nowrap border text-sm font-medium";
        row.appendChild(cell);
      });
      temp.appendChild(row);
    }

    const minWidth = [60, 130, 180, 120, 120, 120, 120, 120, 90];
    for (let i = 0; i < 9; i++) {
      widths[i] = Math.max(minWidth[i], temp.children[0].children[i].getBoundingClientRect().width);
    }

    temp.remove();

    const calculatedGridTemplate = widths
      .map((w, i) => {
        // FIX: Force a strict minimum boundary floor for the fluid name column
        if (i === 2) return `minmax(${w}px, 1fr)`;
        return `${w}px`;
      })
      .join(" ");

    setGridTemplate(calculatedGridTemplate);
  }, [cols]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const now = Date.now();
        if (now - lastEscTime.current < 400) {
          handleDoubleEsc();
        }
        lastEscTime.current = now;
      }
    };
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
          {ADMIN && (
            <Button
              onClick={handleLoadExcel}
              tabIndex={-1}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Load Excel
            </Button>
          )}
          {ADMIN && (
            <Button
              onClick={handleExportDB}
              tabIndex={-1}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Export DB
            </Button>
          )}
          <Button
            onClick={handleRefresh}
            tabIndex={-1}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Refresh DB
          </Button>
        </div>
      </header>

      {/* Body Container */}
      <div className="flex-1 flex flex-col border rounded-md bg-white shadow-sm overflow-hidden">
        {/* Top controls Bar */}
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Items</span>
            <span className="bg-slate-200 px-2 py-0.5 rounded-md">{productCount}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-gray-700">Filtered</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
              {products.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={clearFilter} tabIndex={-1}>
              Clear All Filter
            </Button>
            <Button onClick={clearSorting} tabIndex={-1}>
              Clear Sorting
            </Button>
          </div>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Unified scroll container */}
          <div ref={parentRef} className="flex-1 overflow-auto" style={{ contain: "strict" }}>
            {/* Sticky Header Layer */}
            <div
              className="sticky top-0 z-10 text-slate-100 bg-slate-900 w-max min-w-full"
              style={{ display: "grid" }}
            >
              <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                {headersCode.map((col) => (
                  <div
                    key={col}
                    onClick={() => {
                      if (col !== "id") handleSort(col);
                    }}
                    className={`px-2 py-2 select-none border-r border-slate-700 ${
                      col === "id" ? "pointer-events-none" : "cursor-pointer hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center truncate">
                      {headersTitle[col]}
                      {sortState.column === col && col !== "id" && (
                        <span className="ml-1">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter inputs sub-row */}
              <div
                className="grid bg-slate-100 border-b border-gray-200"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {headersCode.map((key) =>
                  key === "id" ? (
                    <div key={key} className="border-r p-1 bg-slate-100" />
                  ) : (
                    <div key={key} className="border-r p-1 bg-slate-100">
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={filters[key]}
                        onChange={(e) => handleFilterChange(key, e.target.value)}
                        className="w-full px-2 py-0.5 h-7 border border-gray-300 text-black rounded focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Virtualized Table Rows */}
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
                minWidth: "100%",
                width: "max-content",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const product = products[virtualRow.index];
                if (!product) return null;
                return (
                  <div
                    key={product.id}
                    className="absolute left-0 right-0 grid text-sm border-b border-gray-100 hover:bg-slate-100 bg-white text-slate-800"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: gridTemplate,
                      height: `${virtualRow.size}px`,
                    }}
                  >
                    <div className="px-2 py-2 truncate border-r text-center">{product.id}</div>
                    <div className="px-2 py-2 truncate border-r" title={product.code}>
                      {product.code}
                    </div>
                    <div className="px-2 py-2 truncate border-r" title={product.name}>
                      {product.name}
                    </div>
                    <div className="px-2 py-2 truncate border-r" title={product.brand}>
                      {product.brand}
                    </div>
                    <div className="px-2 py-2 truncate border-r" title={product.car_type}>
                      {product.car_type}
                    </div>
                    <div
                      className="px-2 py-2 truncate border-r text-right"
                      title={product.price.toString()}
                    >
                      {new Intl.NumberFormat("id-ID").format(product.price)}
                    </div>
                    <div className="px-2 py-2 truncate border-r" title={product.price_code}>
                      {product.price_code}
                    </div>
                    <div className="px-2 py-2 truncate border-r text-center" title={product.date}>
                      {product.date}
                    </div>
                    <div
                      className="px-2 py-2 truncate border-r text-right"
                      title={product.quantity.toString()}
                    >
                      {product.quantity}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
