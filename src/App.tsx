import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FilterX } from "lucide-react";

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

const ADMIN = true; // easy way to set admin and basic mode

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

  const [gridTemplate, setGridTemplate] = useState<string>(
    "auto auto 1fr auto auto auto auto auto auto",
  );

  const [cols2, setCols2] = useState<number[]>([100, 100, 100, 100, 100, 100, 100, 100, 100]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const lastEscTime = useRef(0);

  async function refreshPage() {
    window.location.reload();
  }

  async function handleRefresh() {
    await invoke<Product[]>("load_db_file")
      .then((result) => {
        setProducts(result);
        toast.success("Refresh sukses");
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
      console.log("Sort State: ", sortState);
      console.log("Filters: ", filters);
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

  const handleClearSpecificFilter = () => {
    if (contextMenu == null) return;
    const key = contextMenu.col;
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const clearSorting = () => {
    setSortState({
      column: "id",
      direction: "asc",
    });
  };

  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (contentRef === null) return;

    const temp = document.createElement("div");
    // temp.className ="flex-1 grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] text-sm";
    temp.className =
      "invisible flex-1 grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] text-sm me-4";
    contentRef.current?.appendChild(temp);

    console.log(contentRef.current?.getBoundingClientRect().width);

    const widths = new Array(9).fill(0);

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
        if (i === 0) cell.className = "px-2 py-2 whitespace-nowrap border text-[16px]";
        else cell.className = "px-2 py-2 pe-8 whitespace-nowrap border text-[16px]";
        row.appendChild(cell);
      });
      temp.appendChild(row);
    }

    {
      const row = document.createElement("div");
      row.className = "contents"; // each child stays in grid context

      const values = [
        "",
        "Search...",
        "Search...",
        "Search...",
        "Search...",
        "Search...",
        "Search...",
        "Search...",
        "Search...",
      ];

      values.forEach((v, i) => {
        const cell = document.createElement("div");
        cell.textContent = String(v);
        if (i === 0) cell.className = "p-1";
        else cell.className = "p-1 w-[80px]";
        row.appendChild(cell);
      });
      temp.appendChild(row);
    }

    for (let i = 0; i < 9; i++) {
      widths[i] = temp.children[0].children[i].getBoundingClientRect().width;
    }

    temp.remove();

    setCols2(widths);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      // 🔁 your recalculation logic here
      console.log(contentRef.current?.getBoundingClientRect().width);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startResize = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = cols2[index];

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      setCols2((cols2) => {
        const newCols = [...cols2];
        newCols[index] = Math.max(40, startWidth + delta);
        return newCols;
      });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    const gridTemplate = cols2
      .map((w) => {
        return `${w}px`;
      })
      .join(" ");

    console.log(gridTemplate);
    setGridTemplate(gridTemplate);
  }, [cols2]);

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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; col: string } | null>(
    null,
  );
  const customMenuRef = useRef<HTMLDivElement | null>(null);

  // Hide menu when clicking anywhere
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const handleRightClick = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      col,
    });
  };

  return (
    <div className="p-6 max-w-screen mx-auto flex flex-col h-screen">
      {contextMenu && (
        <div
          ref={customMenuRef}
          className="absolute fixed min-w-[160px] bg-white text-gray-800 border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <button
            onClick={handleClearSpecificFilter}
            className="w-full flex items-center gap-2 px-2 py-2 hover:bg-rose-500 hover:text-white text-left"
          >
            <FilterX size={16} /> <span>Clear Filter</span>
          </button>
        </div>
      )}

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

      {/* Body */}
      <div className="flex-1 flex flex-col border rounded-md bg-white shadow-sm overflow-hidden">
        {/* Top controls (not scrollable) */}
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
            <Button
              onClick={() => {
                refreshPage();
              }}
              tabIndex={-1}
            >
              Refresh All
            </Button>
            <Button
              onClick={() => {
                clearFilter();
              }}
              tabIndex={-1}
            >
              Clear All Filter
            </Button>
            <Button
              onClick={() => {
                clearSorting();
              }}
              tabIndex={-1}
            >
              Clear Sorting
            </Button>
          </div>
        </div>

        <div className="flex" ref={contentRef} />

        <div className="flex flex-col h-full">
          {/* Scroll container */}
          <div ref={parentRef} className="flex-1 overflow-auto" style={{ contain: "strict" }}>
            {/* Header (sticky) */}
            <div
              className="sticky top-0 z-10 text-slate-100 bg-slate-900 w-max"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                {headersCode.map((col, i) => (
                  <div
                    key={col}
                    onContextMenu={(e) => {
                      if (col !== "id") handleRightClick(e, col);
                    }}
                    className={`relative px-2 py-2 cursor-pointer select-none border-r hover:bg-slate-700`}
                  >
                    <div
                      onClick={() => {
                        if (col !== "id") handleSort(col);
                      }}
                      className="flex justify-between items-center truncate"
                    >
                      {headersTitle[col]}
                      {sortState.column === col && col !== "id" && (
                        <span>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>

                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => startResize(e, i)}
                      className="absolute right-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-blue-400"
                    />
                  </div>
                ))}
              </div>

              {/* Filter inputs row (not scrollable) */}
              <div
                className="grid border-b bg-slate-100"
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
                        className="w-full px-3 py-1 border border-gray-300 text-black rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Body (scrolls together horizontally) */}
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
                return (
                  <div
                    key={product.id}
                    className="absolute left-0 right-0 grid text-sm border-b border-gray-100 hover:bg-slate-200 w-max"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: gridTemplate,
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
