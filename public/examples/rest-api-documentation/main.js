let doc = marked.parse(await(await fetch('README.md')).text());
document.body.innerHTML = `<main>${doc}</main>`;
// console.log = () => { };
hljs.highlightAll();

let idExamples = [1, 'large-portrait', 'natural-wood'];

[...document.querySelectorAll('li code')].forEach(x => {
  let c = x.textContent, a;
  if (c.length <= 2) { return; }
  a = c.replaceAll('GET ', '');
  a.includes(':id') && (a = a.replaceAll(':id', idExamples.shift()));
  let g = c.startsWith('GET') ? 'GET ' : '';
  c = c.replaceAll('GET', '');
  x.innerHTML = `${g}<a href="${a}">${c}</a>`;
});