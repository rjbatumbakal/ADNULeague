import DataTable from "../../components/tables/DataTable";

const columns = [
  { key: "sport", label: "Sport" },
  { key: "round", label: "Round" },
  { key: "team_a", label: "Team A" },
  { key: "score_a", label: "Score A" },
  { key: "team_b", label: "Team B" },
  { key: "score_b", label: "Score B" },
];

function BracketList({ data = [], loading = false, error = null }) {
  if (loading) {
    return <p className="text-sm text-theme-muted">Loading brackets...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load bracket data right now.
      </p>
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={data}
      emptyMessage="Bracket updates have not been published yet."
    />
  );
}

export default BracketList;
