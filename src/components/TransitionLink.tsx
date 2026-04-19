import { useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";

interface TransitionLinkProps {
  to: string;
  className?: string;
  "aria-current"?: "page" | undefined;
  children: React.ReactNode;
}

export default function TransitionLink({ to, className, children, ...rest }: TransitionLinkProps) {
  const navigate = useNavigate();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if ("startViewTransition" in document) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).startViewTransition(() => navigate(to));
    } else {
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
}
