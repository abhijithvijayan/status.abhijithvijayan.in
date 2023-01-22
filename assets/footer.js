import {isEmpty} from 'https://unpkg.com/@abhijithvijayan/ts-utils/lib/esm/index.js';

function searchTree(root, value, key = 'id', {
    reverse = false
} = {}) {
    let stack;
    if (!Array.isArray(root)) {
        stack = [root];
    } else {
        stack = root;
    }
    while (!isEmpty(stack)) {
        const node = stack[reverse ? 'pop' : 'shift']();
        if (node.getAttribute(key) === value) {
            return node;
        }
        if (node.children) {
            stack.push(...node.children);
        }
    }

    return null;
}

// DOM fully loaded and parsed
document.addEventListener("DOMContentLoaded", () => {
    const footer = document.getElementsByTagName("footer")[0];
    if (footer instanceof HTMLElement) {
        const poweredBy = searchTree(footer, "https://instatus.com", "href");
        if (poweredBy instanceof HTMLAnchorElement) {
            poweredBy.href = "javascript:void(0)";
            poweredBy.target = "_self";
            poweredBy.innerHTML = "All Rights Reserved";
        } else {
            console.log(poweredBy)
        }
    }
})