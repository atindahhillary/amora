import { SubmitButton } from "@/components/SubmitButton";
import { sql } from "@/lib/db";
import { addVenueAction, toggleVenueAction } from "../actions";

export default async function VenuesPage() {
  const venues = await sql<{ id: number; name: string; area: string; kind: string; notes: string | null; active: boolean }[]>`
    select * from venues order by active desc, name`;
  return (
    <div className="space-y-5">
      <h1 className="text-4xl">Partner venues</h1>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Area</th><th>Type</th><th>Notes</th><th /></tr></thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.id} className={v.active ? "" : "opacity-50"}>
                <td>{v.name}</td><td>{v.area}</td><td>{v.kind}</td><td className="text-muted">{v.notes}</td>
                <td>
                  <form action={toggleVenueAction}><input type="hidden" name="venueId" value={v.id} />
                    <button className="btn-quiet">{v.active ? "Deactivate" : "Activate"}</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={addVenueAction} className="card grid gap-3 sm:grid-cols-4">
        <input className="input" name="name" placeholder="Name" required />
        <input className="input" name="area" placeholder="Area, e.g. Westlands" required />
        <input className="input" name="kind" placeholder="Café, restaurant…" required />
        <input className="input" name="notes" placeholder="Notes for members" />
        <SubmitButton className="btn-ghost sm:col-span-4 sm:justify-self-start">Add venue</SubmitButton>
      </form>
    </div>
  );
}
