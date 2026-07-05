export type SQLiteUpdateEvent = {
  update_type: number;
  db_name: string | null;
  table_name: string | null;
  row_id: number;
};
