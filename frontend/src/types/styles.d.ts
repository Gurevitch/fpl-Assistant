// Plain CSS: side-effect imports like `import './index.css'`
declare module '*.css';

// If you also use CSS Modules (e.g. `import styles from './x.module.css'`)
declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}
