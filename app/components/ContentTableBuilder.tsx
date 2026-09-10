"use client";

import { useMemo, useState } from "react";

export type ContentTableData = {
  headers: string[];
  rows: string[][];
};

const MAX_COLUMNS = 4;
const MAX_ROWS = 100;

function hasRealTable(value?: ContentTableData | null) {
  return Boolean(
    value &&
      Array.isArray(value.headers) &&
      value.headers.length > 0
  );
}

function normalize(value?: ContentTableData | null): ContentTableData {
  if (hasRealTable(value)) {
    const headers = (value?.headers ?? [])
      .slice(0, MAX_COLUMNS)
      .map((v) => String(v).slice(0, 120));

    return {
      headers,
      rows: (value?.rows ?? [])
        .slice(0, MAX_ROWS)
        .map((row) =>
          headers.map((_, i) =>
            String(row?.[i] ?? "").slice(0, 500)
          )
        ),
    };
  }

  return {
    headers: [
      "Kolom 1",
      "Kolom 2",
      "Kolom 3",
      "Kolom 4",
    ],
    rows: [["", "", "", ""]],
  };
}

export default function ContentTableBuilder({
  initialValue,
}: {
  initialValue?: ContentTableData | null;
}) {
  const initialHasTable = useMemo(
    () => hasRealTable(initialValue),
    [initialValue]
  );

  const initial = useMemo(
    () => normalize(initialValue),
    [initialValue]
  );

  const [enabled, setEnabled] =
    useState(initialHasTable);

  const [headers, setHeaders] =
    useState(initial.headers);

  const [rows, setRows] =
    useState(initial.rows);

  function addColumn() {
    if (headers.length >= MAX_COLUMNS) return;

    setHeaders((current) => [
      ...current,
      `Kolom ${current.length + 1}`,
    ]);

    setRows((current) =>
      current.map((row) => [...row, ""])
    );
  }

  function removeColumn(index: number) {
    if (headers.length <= 1) return;

    setHeaders((current) =>
      current.filter((_, i) => i !== index)
    );

    setRows((current) =>
      current.map((row) =>
        row.filter((_, i) => i !== index)
      )
    );
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;

    setRows((current) => [
      ...current,
      Array.from(
        { length: headers.length },
        () => ""
      ),
    ]);
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="content-table-builder">
      <input
        type="hidden"
        name="table_data"
        value={
          enabled
            ? JSON.stringify({ headers, rows })
            : ""
        }
      />

      <div className="content-table-builder-head">
        <div>
          <strong>Tabel / kolom</strong>

          <p>
            Opsional. Maksimal 4 kolom agar tetap
            nyaman dibaca di desktop, tablet, dan HP.
          </p>
        </div>

        <button
          type="button"
          className="admin-mini"
          onClick={() =>
            setEnabled((value) => !value)
          }
        >
          {enabled
            ? "hapus tabel"
            : "+ tambah tabel"}
        </button>
      </div>

      {enabled && (
        <>
          <div className="table-builder-toolbar">
            <button
              type="button"
              className="admin-mini"
              onClick={addColumn}
              disabled={
                headers.length >= MAX_COLUMNS
              }
              title={
                headers.length >= MAX_COLUMNS
                  ? "Maksimal 4 kolom"
                  : "Tambah kolom"
              }
            >
              + kolom
            </button>

            <button
              type="button"
              className="admin-mini"
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS}
            >
              + baris
            </button>

            <small>
              {headers.length}/{MAX_COLUMNS} kolom
            </small>
          </div>

          <div className="table-builder-scroll">
            <table className="table-builder-table">
              <thead>
                <tr>
                  {headers.map(
                    (header, colIndex) => (
                      <th key={colIndex}>
                        <input
                          value={header}
                          maxLength={120}
                          onChange={(e) =>
                            setHeaders(
                              (current) =>
                                current.map(
                                  (value, i) =>
                                    i === colIndex
                                      ? e.target.value
                                      : value
                                )
                            )
                          }
                        />

                        <button
                          type="button"
                          className="table-remove"
                          onClick={() =>
                            removeColumn(colIndex)
                          }
                          disabled={
                            headers.length <= 1
                          }
                          aria-label={`Hapus kolom ${
                            colIndex + 1
                          }`}
                        >
                          ×
                        </button>
                      </th>
                    )
                  )}

                  <th
                    className="table-row-action-head"
                    aria-hidden="true"
                  />
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row, rowIndex) => (
                    <tr key={rowIndex}>
                      {headers.map(
                        (_, colIndex) => (
                          <td key={colIndex}>
                            <input
                              value={
                                row[
                                  colIndex
                                ] ?? ""
                              }
                              maxLength={500}
                              onChange={(e) =>
                                setRows(
                                  (current) =>
                                    current.map(
                                      (
                                        currentRow,
                                        ri
                                      ) =>
                                        ri ===
                                        rowIndex
                                          ? currentRow.map(
                                              (
                                                cell,
                                                ci
                                              ) =>
                                                ci ===
                                                colIndex
                                                  ? e
                                                      .target
                                                      .value
                                                  : cell
                                            )
                                          : currentRow
                                    )
                                )
                              }
                            />
                          </td>
                        )
                      )}

                      <td className="table-row-delete-cell">
                        <button
                          type="button"
                          className="table-remove"
                          onClick={() =>
                            removeRow(rowIndex)
                          }
                          aria-label={`Hapus baris ${
                            rowIndex + 1
                          }`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}