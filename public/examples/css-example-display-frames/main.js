const css = await(await fetch('style.css')).text();
let pre = document.createElement('pre');
let code = document.createElement('code');
code.textContent = css;
pre.append(code);
document.body.append(pre);

document.body.style.fontFamily = 'Open Sans';
code.style.borderRadius = '20px';

Object.assign(pre.style, {
  fontSize: '16px',
  border: '1px solid #666',
  borderRadius: '20px',
  marginTop: '30px',
});

Object.assign(document.body.style, {
  margin: '0 auto',
  maxWidth: '800px'
});

hljs.highlightAll();