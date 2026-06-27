export default function BackgroundAnimation() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="blob absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="blob blob-delay-2 absolute -right-32 top-1/4 h-80 w-80 rounded-full bg-blue-500/8 blur-3xl" />
      <div className="blob blob-delay-4 absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-500/8 blur-3xl" />
    </div>
  )
}
