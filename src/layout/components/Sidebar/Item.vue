<script>
export default {
  name: 'MenuItem',
  functional: true,
  props: {
    icon: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    }
  },
  render(h, context) {
    const { icon, title } = context.props
    const vnodes = []

    if (icon) {
      if (icon.includes('el-icon')) {
        vnodes.push(<i class={[icon, 'sub-el-icon']} />)
      } else {
        vnodes.push(<svg-icon icon-class={icon}/>)
      }
    }

    if (title) {
      // Wrap the title in a span with a class so we can add spacing relative to the icon.
      // A class is necessary because functional components cannot easily apply scoped styles to JSX elements.
      vnodes.push(<span slot='title' class='menu-item-title'>{(title)}</span>)
    }
    return vnodes
  }
}
</script>

<style scoped>
.sub-el-icon {
  color: currentColor;
  width: 1em;
  height: 1em;
}

/*
 * Add spacing between the icon and the title.  In LTR layouts the space should be on the left side
 * of the icon (margin-left on the title), whereas in RTL layouts the space belongs on the right.
 * The dir attribute on the html element is set via i18n.js so we can key off of it here.
 */
.menu-item-title {
  margin-left: 0.5em;
}
[dir='rtl'] .menu-item-title {
  margin-left: 0;
  margin-right: 0.5em;
}
</style>
