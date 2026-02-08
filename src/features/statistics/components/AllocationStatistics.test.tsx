import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AllocationStatistics } from "./AllocationStatistics";

const categories = [
  {
    _id: "cat-1",
    name: "Healthcare",
    description: "",
    color: "#ef4444",
    order: 0,
  },
  {
    _id: "cat-2",
    name: "Education",
    description: "",
    color: "#3b82f6",
    order: 1,
  },
];

describe("AllocationStatistics", () => {
  it("renders loading state", () => {
    render(
      <AllocationStatistics
        categories={categories}
        aggregates={[]}
        participantCount={2}
        unit="USD"
        symbol="$"
        symbolPosition="prefix"
        isLoading
      />
    );

    expect(screen.getByText("Loading statistics...")).toBeInTheDocument();
  });

  it("renders performance view and can switch tabs", () => {
    render(
      <AllocationStatistics
        categories={categories}
        aggregates={[
          {
            categoryId: "cat-1",
            averagePercentage: 55,
            averageAmount: 110,
            totalAmount: 220,
            totalResponses: 2,
          },
          {
            categoryId: "cat-2",
            averagePercentage: 45,
            averageAmount: 90,
            totalAmount: 180,
            totalResponses: 2,
          },
        ]}
        participantCount={2}
        unit="USD"
        symbol="$"
        symbolPosition="prefix"
        isLoading={false}
      />
    );

    expect(screen.getAllByText("Category Performance")).toHaveLength(2);
    expect(screen.getByText("$110 USD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Participation & Consensus" }));
    expect(screen.getByText("Consensus concentration")).toBeInTheDocument();
    expect(screen.getAllByText("Mainstream").length).toBeGreaterThan(0);
  });
});
