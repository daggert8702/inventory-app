import React from "react";
import "./App.css";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzuLCb8pZgmCr6_foBNa-cVcZCbw75jkt_ev0pPuuqhfWwT_5NMwQhsrvWFPCTQVHj0/exec";

const GROUP_ORDER = [
  "Digi Basics",
  "Digi Extras",
  "Custom Items",
  "Red Package",
  "Green Package",
  "Purple Package",
  "Yellow Package"
];

const RANK_VALUE = {
  Gakusei: 1,
  Shatei: 2,
  Hohei: 3,
  Kyodai: 4,
  Kirika: 5
};

export default function InventorySalesCalculator() {
  const loadState = () => {
    try {
      const saved = localStorage.getItem("inventory_shift");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saved = loadState();

  const [employees, setEmployees] = React.useState([]);
  const [employee, setEmployee] = React.useState(saved?.employee || "");
  const [mode, setMode] = React.useState(saved?.mode || "Day");

  const [allItems, setAllItems] = React.useState([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);

  const [cart, setCart] = React.useState(saved?.cart || []);
  const [shiftTotal, setShiftTotal] = React.useState(saved?.shiftTotal || 0);
  const [shiftItems, setShiftItems] = React.useState(saved?.shiftItems || {});
  const [showShift, setShowShift] = React.useState(saved?.showShift || false);

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?t=${Date.now()}`);
        const data = await res.json();

        setAllItems(data.items || []);
        setEmployees(data.employees || []);

        if (!saved?.employee && data.employees?.length > 0) {
          setEmployee(data.employees[0].name);
        }

        setStatus("Sheet data loaded.");
      } catch (err) {
        console.error(err);
        setStatus("Failed to load sheet data.");
      } finally {
        setItemsLoading(false);
      }
    };

    loadData();
  }, []);

  const currentEmployee = employees.find((e) => e.name === employee);
  const currentRank = currentEmployee?.rank || "Gakusei";

  React.useEffect(() => {
    localStorage.setItem(
      "inventory_shift",
      JSON.stringify({
        employee,
        mode,
        cart,
        shiftTotal,
        shiftItems,
        showShift
      })
    );
  }, [employee, mode, cart, shiftTotal, shiftItems, showShift]);

  const canSeeItem = (item) => {
    const employeeRankValue = RANK_VALUE[currentRank] || 1;
    const itemRankValue = RANK_VALUE[item.minRank] || 1;

    return employeeRankValue >= itemRankValue;
  };

  const visibleItems = allItems.filter(canSeeItem);

  const getItemPrice = (item) => {
    return mode === "Night" ? item.nightPrice : item.dayPrice;
  };

  const addToCart = (item) => {
    const price = getItemPrice(item);

    const cartItem = {
      name: item.name,
      icon: item.icon,
      price,
      mode
    };

    setCart((prev) => {
      const existing = prev.find(
        (p) =>
          p.name === cartItem.name &&
          p.price === cartItem.price &&
          p.mode === cartItem.mode
      );

      if (existing) {
        return prev.map((p) =>
          p.name === cartItem.name &&
          p.price === cartItem.price &&
          p.mode === cartItem.mode
            ? { ...p, qty: p.qty + 1 }
            : p
        );
      }

      return [...prev, { ...cartItem, qty: 1 }];
    });
  };

  const removeFromCart = (itemToRemove) => {
    setCart((prev) =>
      prev
        .map((p) =>
          p.name === itemToRemove.name &&
          p.price === itemToRemove.price &&
          p.mode === itemToRemove.mode
            ? { ...p, qty: p.qty - 1 }
            : p
        )
        .filter((p) => p.qty > 0)
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const sendToSheet = async (payload) => {
    const formData = new URLSearchParams();
    formData.append("payload", JSON.stringify(payload));

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: formData
    });
  };

  const completeSale = async () => {
    if (cart.length === 0) return;

    if (!employee) {
      alert("Select an employee first.");
      return;
    }

    setStatus("Sending sale...");

    const saleData = {
      type: "sale",
      employee,
      rank: currentRank,
      mode,
      total: cartTotal,
      items: cart.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        mode: item.mode,
        total: item.price * item.qty
      }))
    };

    setShiftTotal((p) => p + cartTotal);

    setShiftItems((prev) => {
      const updated = { ...prev };

      cart.forEach((item) => {
        const key = `${item.name}|${item.mode}|${item.price}`;

        if (!updated[key]) {
          updated[key] = {
            name: item.name,
            mode: item.mode,
            price: item.price,
            qty: 0,
            total: 0
          };
        }

        updated[key].qty += item.qty;
        updated[key].total += item.price * item.qty;
      });

      return updated;
    });

    try {
      await sendToSheet(saleData);
      setCart([]);
      setStatus("Sale sent.");
    } catch (err) {
      console.error(err);
      setStatus("Failed to send sale.");
    }
  };

  const endShift = async () => {
    if (shiftTotal === 0) {
      alert("No shift sales to submit.");
      return;
    }

    const ok = window.confirm("End shift and submit shift summary?");
    if (!ok) return;

    setStatus("Ending shift...");

    const shiftData = {
      type: "shift_end",
      employee,
      rank: currentRank,
      shiftTotal,
      items: Object.values(shiftItems)
    };

    try {
      await sendToSheet(shiftData);

      setCart([]);
      setShiftTotal(0);
      setShiftItems({});
      setShowShift(false);

      setStatus("Shift ended and sent.");
      localStorage.removeItem("inventory_shift");
    } catch (err) {
      console.error(err);
      setStatus("Failed to end shift.");
    }
  };

  const resetShift = () => {
    const ok = window.confirm("Reset shift locally?");
    if (!ok) return;

    setShiftTotal(0);
    setShiftItems({});
    setCart([]);
    setStatus("");

    localStorage.removeItem("inventory_shift");
  };

  const copyShift = async () => {
    const lines = Object.values(shiftItems).map(
      (item) =>
        `${item.name} ${item.mode} x${item.qty} @ $${item.price} - $${item.total.toLocaleString()}`
    );

    const text =
      `EMPLOYEE: ${employee}\n` +
      `RANK: ${currentRank}\n` +
      `SHIFT TOTAL: $${shiftTotal.toLocaleString()}\n\nITEMS:\n` +
      lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Shift copied!");
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = (items) =>
    items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );

  const renderItems = (items) =>
    filteredItems(items).map((item) => {
      const price = getItemPrice(item);

      const descriptionText = String(item.description || "").trim();

      const hasDescription =
        descriptionText !== "" && descriptionText !== "0";

      return (
        <button
          key={`${item.group}-${item.name}`}
          className="item-card"
          onClick={() => addToCart(item)}
        >
          <img src={item.icon} alt={item.name} />

          <div className="item-card-content">
            <div className="item-name">{item.name}</div>

            {hasDescription ? (
              <div className="description">{descriptionText}</div>
            ) : (
              <div />
            )}

            <div className="item-price">${price.toLocaleString()}</div>
          </div>
        </button>
      );
    });

  const itemsByGroup = GROUP_ORDER.map((group) => ({
    group,
    items: visibleItems.filter((item) => item.group === group)
  })).filter((section) => section.items.length > 0);

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">Inventory Sales Calculator</h1>

        <div className="layout">
          <main>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 180px 1fr",
                gap: "12px"
              }}
            >
              <select
                className="search"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
              >
                {employees.map((emp) => (
                  <option key={emp.name} value={emp.name}>
                    {emp.name} - {emp.rank}
                  </option>
                ))}
              </select>

              <select
                className="search"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="Day">Day Prices</option>
                <option value="Night">Night Prices</option>
              </select>

              <input
                className="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
              />
            </div>

            {itemsLoading && (
              <div style={{ color: "#aaa", marginBottom: "12px" }}>
                Loading sheet data...
              </div>
            )}

            {itemsByGroup.map((section) => (
              <div key={section.group}>
                <h2 className="section-title">{section.group}</h2>

                <div className="item-grid">
                  {renderItems(section.items)}
                </div>
              </div>
            ))}
          </main>

          <aside className="cart">
            <h2 className="section-title">Cart</h2>

            <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "12px" }}>
              Employee: <strong style={{ color: "white" }}>{employee}</strong>
              <br />
              Rank: <strong style={{ color: "white" }}>{currentRank}</strong>
              <br />
              Mode: <strong style={{ color: "white" }}>{mode}</strong>
            </div>

            {cart.length === 0 && (
              <div style={{ color: "#777", marginBottom: "12px" }}>Empty</div>
            )}

            {cart.map((item) => (
              <div
                key={`${item.name}-${item.mode}-${item.price}`}
                className="cart-row"
              >
                <span>
                  {item.name} {item.mode} x{item.qty}
                </span>

                <span className="money">
                  ${(item.price * item.qty).toLocaleString()}
                </span>

                <button
                  onClick={() => removeFromCart(item)}
                  style={{
                    background: "none",
                    border: 0,
                    color: "#ff5555",
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  -
                </button>
              </div>
            ))}

            <hr style={{ borderColor: "#333", margin: "16px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 900
              }}
            >
              <span>Total</span>
              <span className="money">${cartTotal.toLocaleString()}</span>
            </div>

            <button
              className="btn green"
              onClick={completeSale}
              disabled={cart.length === 0}
            >
              Complete Sale
            </button>

            <button className="btn blue" onClick={() => setShowShift(!showShift)}>
              Shift Earnings
            </button>

            <button className="btn gray" onClick={copyShift}>
              Copy Shift
            </button>

            <button className="btn red" onClick={endShift}>
              End Shift
            </button>

            {status && (
              <div style={{ color: "#aaa", fontSize: "12px", marginTop: "8px" }}>
                {status}
              </div>
            )}

            {showShift && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: 900, marginBottom: "10px" }}>
                  Shift: ${shiftTotal.toLocaleString()}
                </div>

                {Object.values(shiftItems).map((item) => (
                  <div
                    key={`${item.name}-${item.mode}-${item.price}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      marginBottom: "6px"
                    }}
                  >
                    <span>
                      {item.name} {item.mode} x{item.qty}
                    </span>

                    <span className="money">
                      ${item.total.toLocaleString()}
                    </span>
                  </div>
                ))}

                <button className="btn red" onClick={resetShift}>
                  Reset Local Shift
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}