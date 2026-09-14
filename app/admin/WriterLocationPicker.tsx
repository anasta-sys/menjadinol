"use client";

import { useState } from "react";

type Props = {
  value?: string;
  onChange?: (location: string) => void;
};

export default function WriterLocationPicker({
  value = "",
  onChange,
}: Props) {
  const [location, setLocation] =
    useState(value);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function detectLocation() {
    setMessage("");

    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setMessage(
        "Perangkat ini tidak mendukung deteksi lokasi."
      );
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          /*
           * Koordinat hanya dipakai sementara
           * untuk mengetahui nama area.
           *
           * TIDAK disimpan ke database.
           */
          const response = await fetch(
            `/api/location/reverse?lat=${encodeURIComponent(
              latitude
            )}&lng=${encodeURIComponent(
              longitude
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result?.error ||
                "Lokasi tidak dapat dikenali."
            );
          }

          const area =
            String(
              result?.location || ""
            ).trim();

          if (!area) {
            throw new Error(
              "Nama lokasi tidak ditemukan."
            );
          }

          setLocation(area);
          onChange?.(area);

          setMessage(
            "Lokasi berhasil dikenali."
          );
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Lokasi tidak dapat dikenali."
          );
        } finally {
          setLoading(false);
        }
      },

      () => {
        setLoading(false);

        setMessage(
          "Izin lokasi tidak diberikan. Tulisan tetap dapat dibuat tanpa lokasi."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function clearLocation() {
    setLocation("");
    onChange?.("");
    setMessage("");
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
      }}
    >
      <input
        type="hidden"
        name="writer_location"
        value={location}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={detectLocation}
          disabled={loading}
          style={{
            minHeight: "38px",
            padding: "0 14px",
            border:
              "1px solid rgba(95,116,95,.35)",
            borderRadius: "999px",
            background: "#f7f8f3",
            color: "#49604c",
            fontWeight: 700,
            cursor: loading
              ? "wait"
              : "pointer",
          }}
        >
          {loading
            ? "Mendeteksi lokasi..."
            : "⌖ Gunakan lokasi saya"}
        </button>

        {location && (
          <button
            type="button"
            onClick={clearLocation}
            style={{
              border: 0,
              background: "transparent",
              color: "#7b817b",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            hapus lokasi
          </button>
        )}
      </div>

      {location && (
        <div
          style={{
            fontSize: "13px",
            color: "#5e6e60",
          }}
        >
          📍 {location}
        </div>
      )}

      {message && (
        <div
          style={{
            fontSize: "12px",
            color: "#747c74",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}