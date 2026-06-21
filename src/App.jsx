import React from "react";
import "./App.css";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPKiV1fQukECduDGqlE8Q3axbAu89AB_nHCRK19QhVbdtppeM6AcWSjAl6013nwtDW/exec";

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
  "New Hire": 1,
  Gakusei: 1,
  Employee: 2,
  Shatei: 2,
  "Adv Employee": 3,
  Hohei: 3,
  Manager: 4,
  Kyodai: 4,
  Owner: 5,
  Kirika: 5
};

const DISCOUNTS = [
  { label: "No Discount", value: 0 },
  { label: "5% Discount", value: 5 },
  { label: "10% Discount", value: 10 },
  { label: "15% Discount", value: 15 },
  { label: "20% Discount", value: 20 },
  { label: "25% Discount", value: 25 },
  { label: "50% Discount", value: 50 }
];

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
  const [secondaryEmployee, setSecondaryEmployee] = React.useState(
    saved?.secondaryEmployee || ""
  );
  const [mode, setMode] = React.useState(saved?.mode || "Day");
  const [discount, setDiscount] = React.useState(saved?.discount || 0);

  const [allItems, setAllItems] = React.useState([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);

  const [cart, setCart] = React.useState(saved?.cart || []);
  const [shiftTotal, setShiftTotal] = React.useState(saved?.shiftTotal || 0);
  const [shiftItems, setShiftItems] = React.useState(saved?.shiftItems || {});
  const [showShift, setShowShift] = React.useState(saved?.showShift || false);

  const [showDescriptions, setShowDescriptions] = React.useState(
    saved?.showDescriptions ?? true
  );
  const [compactCards, setCompactCards] = React.useState(
    saved?.compactCards ?? false
  );
  const [overrideRank, setOverrideRank] = React.useState(
    saved?.overrideRank ?? false
  );

  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(GOOGLE_SCRIPT_URL + "?t=" + Date.now());
        const data = await res.json();
        const loadedEmployees = data.employees || [];

        setAllItems(data.items || []);
        setEmployees(loadedEmployees);

        if (!saved?.employee && loadedEmployees.length > 0) {
          setEmployee(loadedEmployees[0].name);
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

  const getFullEmployeeName = React.useCallback(
    (name, fallbackToFirst = true) => {
      const cleanName = String(name || "").trim().toLowerCase();

      if (!cleanName || employees.length === 0) {
        return fallbackToFirst ? employees[0]?.name || "" : "";
      }

      const exactMatch = employees.find(
        (emp) => String(emp.name || "").trim().toLowerCase() === cleanName
      );

      if (exactMatch) {
        return exactMatch.name;
      }

      const firstNameMatches = employees.filter((emp) => {
        const fullName = String(emp.name || "").trim().toLowerCase();
        const firstName = fullName.split(/\s+/)[0];
        return firstName === cleanName;
      });

      if (firstNameMatches.length === 1) {
        return firstNameMatches[0].name;
      }

      return fallbackToFirst ? employees[0]?.name || "" : "";
    },
    [employees]
  );

  React.useEffect(() => {
    if (employees.length === 0) {
      return;
    }

    const fixedEmployee = getFullEmployeeName(employee, true);

    if (fixedEmployee && fixedEmployee !== employee) {
      setEmployee(fixedEmployee);
    }

    if (secondaryEmployee) {
      const fixedSecondaryEmployee = getFullEmployeeName(
        secondaryEmployee,
        false
      );

      if (
        fixedSecondaryEmployee &&
        fixedSecondaryEmployee !== secondaryEmployee
      ) {
        setSecondaryEmployee(fixedSecondaryEmployee);
      }

      if (!fixedSecondaryEmployee) {
        setSecondaryEmployee("");
      }
    }
  }, [employees, employee, secondaryEmployee, getFullEmployeeName]);

  const fullEmployeeName = getFullEmployeeName(employee, true);
  const fullSecondaryEmployeeName = secondaryEmployee
    ? getFullEmployeeName(secondaryEmployee, false)
    : "";

  const currentEmployee = employees.find((e) => e.name === fullEmployeeName);
  const currentRank = currentEmployee?.rank || "New Hire";

  React.useEffect(() => {
    localStorage.setItem(
      "inventory_shift",
      JSON.stringify({
        employee: fullEmployeeName || employee,
        secondaryEmployee: fullSecondaryEmployeeName,
        mode,
        discount,
        cart,
        shiftTotal,
        shiftItems,
        showShift,
        showDescriptions,
        compactCards,
        overrideRank
      })
    );
  }, [
    employee,
    secondaryEmployee,
    fullEmployeeName,
    fullSecondaryEmployeeName,
    mode,
    discount,
    cart,
    shiftTotal,
    shiftItems,
    showShift,
    showDescriptions,
    compactCards,
    overrideRank
  ]);

  const canSeeItem = (item) => {
    const employeeRankValue = RANK_VALUE[currentRank] || 1;
    const itemRankValue = RANK_VALUE[item.minRank] || 1;
    return employeeRankValue >= itemRankValue;
  };

  const visibleItems = overrideRank ? allItems : allItems.filter(canSeeItem);

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

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const discountAmount = Math.round(subtotal * (Number(discount) / 100));
  const cartTotal = subtotal - discountAmount;

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

    const cashierName = getFullEmployeeName(employee, true);
    const secondaryName = secondaryEmployee
      ? getFullEmployeeName(secondaryEmployee, false)
      : "";

    if (!cashierName) {
      alert("Select a cashier first.");
      return;
    }

    if (cashierName !== employee) {
      setEmployee(cashierName);
    }

    if (secondaryEmployee && secondaryName !== secondaryEmployee) {
      setSecondaryEmployee(secondaryName);
    }

    setStatus("Sending sale...");

    const saleData = {
      type: "sale",
      employee: cashierName,
      secondaryEmployee: secondaryName,
      subtotal,
      discount: Number(discount),
      discountAmount,
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
        const key = item.name + "|" + item.mode + "|" + item.price;

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

    const cashierName = getFullEmployeeName(employee, true);
    const secondaryName = secondaryEmployee
      ? getFullEmployeeName(secondaryEmployee, false)
      : "";

    if (!cashierName) {
      alert("Select a cashier first.");
      return;
    }

    const ok = window.confirm("End shift and submit shift summary?");
    if (!ok) return;

    if (cashierName !== employee) {
      setEmployee(cashierName);
    }

    if (secondaryEmployee && secondaryName !== secondaryEmployee) {
      setSecondaryEmployee(secondaryName);
    }

    setStatus("Ending shift...");

    const shiftData = {
      type: "shift_end",
      employee: cashierName,
      secondaryEmployee: secondaryName,
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

  const renderItems = (items) =>
    items.map((item) => {
      const price = getItemPrice(item);
      const descriptionText = String(item.description || "").trim();

      const hasDescription =
        showDescriptions &&
        !compactCards &&
        descriptionText !== "" &&
        descriptionText !== "0";

      return (
        <button
          key={item.group + "-" + item.name}
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
    <div className={"app " + (compactCards ? "compact" : "")}>
      <div className="container">
        <h1 className="title">Inventory Sales Calculator</h1>

        <div className="layout">
          <main>
            <div className="top-controls">
              <div className="control-stack">
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
                  value={secondaryEmployee}
                  onChange={(e) => setSecondaryEmployee(e.target.value)}
                >
                  <option value="">No Secondary</option>

                  {employees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.name} - {emp.rank}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-stack">
                <select
                  className="search"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="Day">Day Prices</option>
                  <option value="Night">Night Prices</option>
                </select>

                <select
                  className="search"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                >
                  {DISCOUNTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="toggle-column">
                <label className="toggle-setting">
                  <input
                    type="checkbox"
                    checked={overrideRank}
                    onChange={(e) => setOverrideRank(e.target.checked)}
                  />
                  Override Rank
                </label>

                <label className="toggle-setting">
                  <input
                    type="checkbox"
                    checked={compactCards}
                    onChange={(e) => setCompactCards(e.target.checked)}
                  />
                  Compact
                </label>

                <label className="toggle-setting">
                  <input
                    type="checkbox"
                    checked={showDescriptions}
                    onChange={(e) => setShowDescriptions(e.target.checked)}
                  />
                  Descriptions
                </label>
              </div>
            </div>

            {itemsLoading && (
              <div style={{ color: "#aaa", marginBottom: "12px" }}>
                Loading sheet data...
              </div>
            )}

            {itemsByGroup.map((section) => (
              <div key={section.group}>
                <h2 className="section-title">{section.group}</h2>

                <div className="item-grid">{renderItems(section.items)}</div>
              </div>
            ))}
          </main>

          <aside className="cart">
            <h2 className="section-title">Cart</h2>

            <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "12px" }}>
              Cashier:{" "}
              <strong style={{ color: "white" }}>
                {fullEmployeeName || employee}
              </strong>
              <br />
              Secondary:{" "}
              <strong style={{ color: "white" }}>
                {fullSecondaryEmployeeName || "None"}
              </strong>
              <br />
              Rank: <strong style={{ color: "white" }}>{currentRank}</strong>
              <br />
              Mode: <strong style={{ color: "white" }}>{mode}</strong>
              <br />
              Discount:{" "}
              <strong style={{ color: "white" }}>
                {Number(discount) > 0 ? discount + "%" : "None"}
              </strong>
            </div>

            {cart.length === 0 && (
              <div style={{ color: "#777", marginBottom: "12px" }}>Empty</div>
            )}

            {cart.map((item) => (
              <div
                key={item.name + "-" + item.mode + "-" + item.price}
                className="cart-row"
              >
                <span>
                  {item.name} [{item.mode}] x{item.qty}
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

            {Number(discount) > 0 && (
              <>
                <div className="cart-total-line">
                  <span>Subtotal</span>
                  <span className="money">${subtotal.toLocaleString()}</span>
                </div>

                <div className="cart-total-line">
                  <span>Discount</span>
                  <span style={{ color: "#ff7777", fontWeight: 900 }}>
                    -${discountAmount.toLocaleString()}
                  </span>
                </div>
              </>
            )}

            <div className="cart-total-line final">
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
                    key={item.name + "-" + item.mode + "-" + item.price}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      marginBottom: "6px"
                    }}
                  >
                    <span>
                      {item.name} [{item.mode}] x{item.qty}
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
