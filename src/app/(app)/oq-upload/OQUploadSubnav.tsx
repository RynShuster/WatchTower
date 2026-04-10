import Link from "next/link";

type OQUploadSubnavProps = {
  currentPage: "upload" | "tolerances";
};

const items = [
  { href: "/oq-upload", label: "Upload", key: "upload" },
  { href: "/oq-upload/tolerances", label: "Tolerances", key: "tolerances" },
] as const;

export function OQUploadSubnav({ currentPage }: OQUploadSubnavProps) {
  return (
    <nav className="oqSubnav" aria-label="OQ Upload pages">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="oqSubnavLink" data-active={item.key === currentPage}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
