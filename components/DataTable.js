"use client";

import { useState } from "react";

export default function DataTable({ columns, data, searchPlaceholder = "Search...", searchKey }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter data based on search term
  const filteredData = data.filter((item) => {
    if (!searchTerm || !searchKey) return true;
    const value = item[searchKey];
    if (!value) return false;
    return String(value).toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div>
      {searchKey && (
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "flex-end" }}>
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: "300px" }}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
          />
        </div>
      )}

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ textAlign: col.align || "left" }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} style={{ textAlign: col.align || "left" }}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} entries
          </span>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                className={`btn ${currentPage === idx + 1 ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", minWidth: "32px" }}
                onClick={() => handlePageChange(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}
            <button
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
