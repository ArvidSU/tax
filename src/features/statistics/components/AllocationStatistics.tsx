import { useMemo, useState, type ReactElement } from "react";
import type { Category, AllocationAggregate } from "../../../types";
import { formatAmountWithSymbol } from "../../../utils/formatAmount";
import type { SymbolPosition } from "../../../utils/formatAmount";
import "./AllocationStatistics.css";

interface StatisticsRow {
  categoryId: string;
  name: string;
  color: string;
  averagePercentage: number;
  averageAmount: number;
  totalAmount: number;
  totalResponses: number;
  responseRate: number;
}

interface StatisticsViewProps {
  rows: StatisticsRow[];
  participantCount: number;
  unit: string;
  symbol: string;
  symbolPosition: SymbolPosition;
}

interface StatisticsView {
  id: string;
  label: string;
  description: string;
  render: (props: StatisticsViewProps) => ReactElement;
}

interface AllocationStatisticsProps {
  categories: Category[];
  aggregates: AllocationAggregate[];
  participantCount: number;
  unit: string;
  symbol: string;
  symbolPosition: SymbolPosition;
  isLoading: boolean;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function CategoryPerformanceView({
  rows,
  unit,
  symbol,
  symbolPosition,
}: StatisticsViewProps) {
  const sorted = [...rows].sort((a, b) => b.averageAmount - a.averageAmount);

  return (
    <div className="statistics-view">
      <div className="statistics-view-head">
        <h4>Category Performance</h4>
        <span>{sorted.length} categories with responses</span>
      </div>
      <div className="statistics-table-wrap">
        <table className="statistics-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Avg Share</th>
              <th>Avg Amount</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.categoryId}>
                <td>
                  <div className="statistics-category-cell">
                    <span
                      className="statistics-color-dot"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </div>
                </td>
                <td>
                  <div className="statistics-bar-cell">
                    <div className="statistics-track">
                      <div
                        className="statistics-fill"
                        style={{
                          width: `${Math.min(100, row.averagePercentage)}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                    <span>{formatPercent(row.averagePercentage)}</span>
                  </div>
                </td>
                <td>
                  {formatAmountWithSymbol(
                    row.averageAmount,
                    symbol,
                    symbolPosition
                  )}{" "}
                  {unit}
                </td>
                <td>
                  {formatAmountWithSymbol(
                    row.totalAmount,
                    symbol,
                    symbolPosition
                  )}{" "}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParticipationConsensusView({
  rows,
  participantCount,
}: StatisticsViewProps) {
  const sortedByCoverage = [...rows].sort((a, b) => b.responseRate - a.responseRate);
  const sortedByShare = [...rows].sort(
    (a, b) => b.averagePercentage - a.averagePercentage
  );
  const top = sortedByShare[0];
  const second = sortedByShare[1];
  const participationRate = participantCount > 0 ? (top?.responseRate ?? 0) : 0;
  const concentrationIndex = rows.reduce((sum, row) => {
    const share = row.averagePercentage / 100;
    return sum + share * share;
  }, 0);
  const spreadGap = top ? top.averagePercentage - (second?.averagePercentage ?? 0) : 0;

  return (
    <div className="statistics-view">
      <div className="statistics-kpis">
        <article className="statistics-kpi">
          <span>Active participant rate</span>
          <strong>{formatPercent(participationRate * 100)}</strong>
        </article>
        <article className="statistics-kpi">
          <span>Consensus concentration</span>
          <strong>{Math.round(concentrationIndex * 1000) / 1000}</strong>
        </article>
        <article className="statistics-kpi">
          <span>Lead over next category</span>
          <strong>{formatPercent(spreadGap)}</strong>
        </article>
      </div>

      <div className="statistics-table-wrap">
        <table className="statistics-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Coverage</th>
              <th>Avg Share</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {sortedByCoverage.map((row) => (
              <tr key={row.categoryId}>
                <td>
                  <div className="statistics-category-cell">
                    <span
                      className="statistics-color-dot"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </div>
                </td>
                <td>
                  <div className="statistics-bar-cell">
                    <div className="statistics-track">
                      <div
                        className="statistics-fill"
                        style={{
                          width: `${Math.min(100, row.responseRate * 100)}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                    <span>
                      {row.totalResponses}/{participantCount}
                    </span>
                  </div>
                </td>
                <td>{formatPercent(row.averagePercentage)}</td>
                <td>
                  <span className="statistics-signal">
                    {row.responseRate >= 0.7
                      ? "Mainstream"
                      : row.responseRate >= 0.35
                        ? "Balanced"
                        : "Niche"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const statisticsViews: StatisticsView[] = [
  {
    id: "category-performance",
    label: "Category Performance",
    description: "Compare average and total allocations by category.",
    render: (props) => <CategoryPerformanceView {...props} />,
  },
  {
    id: "participation-consensus",
    label: "Participation & Consensus",
    description: "See where members agree and how concentrated allocations are.",
    render: (props) => <ParticipationConsensusView {...props} />,
  },
];

export function AllocationStatistics({
  categories,
  aggregates,
  participantCount,
  unit,
  symbol,
  symbolPosition,
  isLoading,
}: AllocationStatisticsProps) {
  const [activeViewId, setActiveViewId] = useState(statisticsViews[0].id);

  const rows = useMemo<StatisticsRow[]>(() => {
    const aggregateByCategoryId = new Map(
      aggregates.map((aggregate) => [aggregate.categoryId, aggregate])
    );

    return categories
      .map((category) => {
        const aggregate = aggregateByCategoryId.get(category._id);
        return {
          categoryId: category._id,
          name: category.name,
          color: category.color,
          averagePercentage: aggregate?.averagePercentage ?? 0,
          averageAmount: aggregate?.averageAmount ?? 0,
          totalAmount: aggregate?.totalAmount ?? 0,
          totalResponses: aggregate?.totalResponses ?? 0,
          responseRate:
            participantCount > 0
              ? (aggregate?.totalResponses ?? 0) / participantCount
              : 0,
        };
      })
      .filter((row) => row.totalResponses > 0);
  }, [aggregates, categories, participantCount]);

  const activeView = statisticsViews.find((view) => view.id === activeViewId) ?? statisticsViews[0];

  return (
    <section className="allocation-statistics" aria-label="Allocation statistics">
      <div className="allocation-statistics-header">
        <div>
          <h3>Allocation statistics</h3>
          <p>
            Aggregated insights from {participantCount} board member
            {participantCount === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="allocation-statistics-tabs" role="tablist" aria-label="Statistics views">
          {statisticsViews.map((view) => (
            <button
              key={view.id}
              type="button"
              role="tab"
              aria-selected={view.id === activeView.id}
              className={`allocation-statistics-tab ${view.id === activeView.id ? "active" : ""}`}
              onClick={() => setActiveViewId(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <p className="allocation-statistics-description">{activeView.description}</p>

      {isLoading ? (
        <div className="allocation-statistics-empty">Loading statistics...</div>
      ) : rows.length === 0 ? (
        <div className="allocation-statistics-empty">
          No aggregate data yet. Insights appear once members submit allocations.
        </div>
      ) : (
        activeView.render({
          rows,
          participantCount,
          unit,
          symbol,
          symbolPosition,
        })
      )}
    </section>
  );
}

export type { AllocationStatisticsProps };
