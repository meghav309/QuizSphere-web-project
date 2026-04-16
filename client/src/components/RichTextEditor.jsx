import { createElement, useEffect, useRef } from 'react'
import { FiBold, FiItalic, FiList, FiType } from 'react-icons/fi'
import styles from '../styles/editor.module.css'

const actions = [
  { label: 'Bold', icon: FiBold, command: 'bold' },
  { label: 'Italic', icon: FiItalic, command: 'italic' },
  { label: 'Bullet List', icon: FiList, command: 'insertUnorderedList' },
  { label: 'Heading', icon: FiType, command: 'formatBlock', value: 'h3' },
]

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const runCommand = (command, commandValue) => {
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML || '')
  }

  return (
    <div className={styles.editorWrap}>
      <div className={styles.toolbar}>
        {actions.map(({ label, icon: Icon, command, value: commandValue }) => (
          <button
            key={label}
            type="button"
            className={styles.toolbarButton}
            onClick={() => runCommand(command, commandValue)}
          >
            {createElement(Icon)}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        data-placeholder={placeholder}
      />
    </div>
  )
}

export default RichTextEditor
