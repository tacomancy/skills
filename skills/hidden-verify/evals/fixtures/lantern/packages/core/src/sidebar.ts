// Renders the notebook's page list. The first page is selected on open; a click moves the selection.
export function renderSidebar(root: HTMLElement, pages: string[]) {
  const list = document.createElement("ul");
  list.className = "sidebar";
  pages.forEach((name, i) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.setAttribute("aria-selected", String(i === 0));
    li.addEventListener("click", () => select(list, li));
    list.append(li);
  });
  root.replaceChildren(list);
  list.dataset.ready = "true";
}

function select(list: HTMLUListElement, li: HTMLLIElement) {
  for (const row of list.children) row.setAttribute("aria-selected", "false");
  li.setAttribute("aria-selected", "true");
}
