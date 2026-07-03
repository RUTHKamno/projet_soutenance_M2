export type SupportedViz = "bar" | "line" | "pie" | "table";

export function buildVizParams(
  vizKind: SupportedViz,
  datasetId: number,
  columns: string[],
  metricColumn: string,
  dimensionColumn: string,
) {
  const datasource = `${datasetId}__table`;
  const baseMetric = {
    expressionType: "SIMPLE",
    column: { column_name: metricColumn },
    aggregate: "SUM",
    label: `Somme ${metricColumn}`,
  };

  switch (vizKind) {
    case "bar":
      return {
        viz_type: "echarts_timeseries_bar",
        datasource,
        x_axis: dimensionColumn,
        metrics: [baseMetric],
        groupby: [],
        adhoc_filters: [],
        row_limit: 100,
      };
    case "line":
      return {
        viz_type: "echarts_timeseries_line",
        datasource,
        x_axis: dimensionColumn,
        metrics: [baseMetric],
        groupby: [],
        adhoc_filters: [],
        row_limit: 100,
      };
    case "pie":
      return {
        viz_type: "pie",
        datasource,
        groupby: [dimensionColumn],
        metric: baseMetric,
        adhoc_filters: [],
        row_limit: 20,
      };
    case "table":
      return {
        viz_type: "table",
        datasource,
        query_mode: "raw",
        all_columns: columns,
        row_limit: 100,
      };
  }
}

export interface SupersetChartCreationResult {
  id: number;
  result?: Record<string, unknown>;
  [key: string]: unknown;
}
