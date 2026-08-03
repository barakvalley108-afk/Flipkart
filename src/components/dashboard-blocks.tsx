type Metric = {
  label: string;
  value: string;
  detail: string;
};

export function MetricsGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="metrics-grid">
      {metrics.map((metric) => (
        <article key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </article>
      ))}
    </section>
  );
}

export function OperationsTable({
  title,
  rows
}: {
  title: string;
  rows: Array<{
    id: string;
    customer: string;
    source: string;
    amount: string;
    status: string;
  }>;
}) {
  return (
    <section className="panel-card">
      <div className="panel-card-heading">
        <div>
          <span>LIVE OPERATIONS</span>
          <h2>{title}</h2>
        </div>
        <button type="button">View all</button>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.id}</strong></td>
                <td>{row.customer}</td>
                <td>{row.source}</td>
                <td>{row.amount}</td>
                <td><span className="status-chip">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ActionGrid({
  title,
  actions
}: {
  title: string;
  actions: Array<{ title: string; detail: string }>;
}) {
  return (
    <section className="panel-card">
      <div className="panel-card-heading">
        <div>
          <span>QUICK ACTIONS</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="action-grid">
        {actions.map((action, index) => (
          <button type="button" key={action.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{action.title}</strong>
            <small>{action.detail}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
