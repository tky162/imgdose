/// <reference types="vitest" />

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Home from "@/app/page";

const mockResponse = {
  ok: true,
  items: [],
  pagination: {
    total: 0,
    page: 1,
    pageSize: 20,
    hasNext: false,
    hasPrev: false,
  },
  stats: {
    totalCount: 0,
    totalBytes: 0,
    latestUploadedAt: null,
  },
};

describe("Home", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard title and view toggle", async () => {
    render(<Home />);

    expect(
      await screen.findByRole("heading", { name: "画像ダッシュボード" }),
    ).toBeInTheDocument();

    const galleryButton = await screen.findByRole("radio", {
      name: "ギャラリー表示",
    });
    expect(galleryButton).toBeInTheDocument();

    fireEvent.click(galleryButton);
    expect(galleryButton).toHaveAttribute("aria-checked", "true");

    const uploadButton = await screen.findByRole("button", {
      name: "アップロードを開始",
    });
    expect(uploadButton).toBeDisabled();
  });
});
