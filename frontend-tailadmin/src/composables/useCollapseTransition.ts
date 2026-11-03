/**
 * Hook transisi tinggi untuk elemen yang dibuka/ditutup dengan `v-show`.
 *
 * Dipakai sebagai listener Vue `<transition>`:
 *   @enter / @before-leave = startTransition
 *   @after-enter / @after-leave = endTransition
 *
 * Tinggi diukur dari konten sebenarnya lalu dianimasikan, sehingga transisi
 * tidak bergantung pada tinggi yang di-hardcode.
 */
export function useCollapseTransition() {
  const startTransition = (el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = 'auto'
    const height = htmlEl.scrollHeight
    htmlEl.style.height = '0px'
    void htmlEl.offsetHeight // force reflow
    htmlEl.style.height = height + 'px'
  }

  const endTransition = (el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = ''
  }

  return { startTransition, endTransition }
}
