export default function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#F47B20]/30 border-t-[#F47B20] rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">{label}</p>
      </div>
    </div>
  );
}
