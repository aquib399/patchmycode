export default function ErrorComp({
  text = "Something went wrong"
}: {
  text?: string;
}) {
  return (
    <div className="flex grow items-center justify-center">
      <p className="text-destructive text-sm">{text}</p>
    </div>
  );
}
