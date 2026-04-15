import DataTable from "../../components/tables/DataTable";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getDirectoryEntries } from "../../services/directoryService";

const columns = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "contact", label: "Contact" },
  { key: "department", label: "Department" },
];

function DirectoryTable() {
  const { data, loading, error } = useAsyncData(getDirectoryEntries, []);

  if (loading) {
    return <p className="text-sm text-theme-muted">Loading directory...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load directory entries right now.
      </p>
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={data}
      emptyMessage="Directory entries will be posted soon."
    />
  );
}

export default DirectoryTable;
