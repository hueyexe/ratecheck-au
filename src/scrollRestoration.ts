export function shouldResetScroll(previousPathname: string | null, nextPathname: string) {
  return previousPathname !== null && previousPathname !== nextPathname;
}
