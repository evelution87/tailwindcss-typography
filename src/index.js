const plugin = require('tailwindcss/plugin')
const merge = require('lodash.merge')
const castArray = require('lodash.castarray')
const styles = require('./styles')

const computed = {
  // Reserved for future "magic properties", for example:
  // bulletColor: (color) => ({ 'ul > li::before': { backgroundColor: color } }),
}

function inWhere(selector, { className, prefix }) {
  let prefixedNot = prefix(`.not-${className}`).slice(1)

  if (selector.endsWith('::before')) {
    if (selector.startsWith('>')) {
      return `> :where(${selector.slice(2, -8)}):not(:where([class~="${prefixedNot}"] *))::before`
    }
    return `:where(${selector.slice(0, -8)}):not(:where([class~="${prefixedNot}"] *))::before`
  }

  if (selector.endsWith('::after')) {
    if (selector.startsWith('>')) {
      return `> :where(${selector.slice(2, -8)}):not(:where([class~="${prefixedNot}"] *))::before`
    }
    return `:where(${selector.slice(0, -7)}):not(:where([class~="${prefixedNot}"] *))::after`
  }

  if (selector.startsWith('>')) {
    return `> :where(${selector.slice(2)}):not(:where([class~="${prefixedNot}"] *))`
  }

  return `:where(${selector}):not(:where([class~="${prefixedNot}"] *))`
}

function isObject(value) {
  return typeof value === 'object' && value !== null
}

function configToCss(config = {}, { target, className, prefix }) {
  function updateSelector(k, v) {
    if (target === 'legacy') {
      return [k, v]
    }

    if (isObject(v)) {
      let nested = Object.values(v).some(isObject)
      if (nested) {
        return [k, Object.fromEntries(Object.entries(v).map(([k, v]) => updateSelector(k, v)))]
      }

      return [inWhere(k, { className, prefix }), v]
    }

    return [k, v]
  }

  return Object.fromEntries(
    Object.entries(
      merge(
        {},
        ...Object.keys(config)
          .filter((key) => computed[key])
          .map((key) => computed[key](config[key])),
        ...castArray(config.css || {})
      )
    ).map(([k, v]) => updateSelector(k, v))
  )
}

module.exports = plugin.withOptions(
  ({ className = 'prose', target = 'modern' } = {}) => {
    return function ({ addVariant, addComponents, theme, prefix }) {
      let modifiers = theme('typography')

      let options = { className, prefix }

      for (let [name, selector] of [
        // Special names
        ['bullets', 'ul > li::before'],
        ['counters', 'ol > li::before'],
        ['headings', 'h1, h2, h3, h4, th'],
        ['captions', 'figure figcaption'],
        ['images', 'img'],
        ['lead', '[class~="lead"]'],
        ['links', 'a'],
        ['quotes', 'blockquote'],
        ['bold', 'strong'],
        ['italic', 'em'],
        // Simple elements
        ['h1', 'h1'],
        ['h2', 'h2'],
        ['h3', 'h3'],
        ['h4', 'h4'],
        ['th', 'th'],
        ['code', 'code'],
        ['pre', 'pre'],
        ['thead', 'thead'],
        ['tr', 'tr'],
        ['hr', 'hr'],
      ]) {
        addVariant(`${className}-${name}`, `& :is(${inWhere(selector, options)})`)
      }

      addComponents(
        Object.keys(modifiers).map((modifier) => ({
          [modifier === 'DEFAULT' ? `.${className}` : `.${className}-${modifier}`]: configToCss(
            modifiers[modifier],
            {
              target,
              className,
              prefix,
            }
          ),
        }))
      )
    }
  },
  () => {
    return {
      theme: { typography: styles },
    }
  }
)
