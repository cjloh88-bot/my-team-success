import { Shell } from "@/app/components";

export default function Loading() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    </Shell>
  );
}
