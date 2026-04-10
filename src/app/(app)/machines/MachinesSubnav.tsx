import Link from "next/link";

type MachinesSubnavProps = {
  currentPage: "list" | "upload";
};

const items = [
  { href: "/machines", label: "Machine List", key: "list" },
  { href: "/machines/upload", label: "Add Machine", key: "upload" },
] as const;

export function MachinesSubnav({ currentPage }: MachinesSubnavProps) {
  return (
    <nav className="machinesSubnav" aria-label="Machine pages">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="machinesSubnavLink"
          data-active={item.key === currentPage}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
