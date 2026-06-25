import { message } from 'antd'

/**
 * 通用文件保存工具（自动兼容 Web 和 Tauri）
 * - 在 Tauri 桌面端：调用系统原生文件保存弹窗，支持自定义路径。
 * - 在 网页端：使用浏览器默认的 Blob 下载机制。
 */
export async function exportFile(filename: string, uint8Array: Uint8Array, mimeType: string = 'application/octet-stream') {
  if ((window as any).__TAURI__) {
    try {
      const { save } = await import('@tauri-apps/api/dialog')
      const { writeBinaryFile } = await import('@tauri-apps/api/fs')
      
      const filePath = await save({
        defaultPath: filename,
        title: '选择保存路径'
      })
      
      if (filePath) {
        await writeBinaryFile(filePath, uint8Array)
        message.success('文件已成功保存到指定路径')
      }
    } catch (e: any) {
      console.error(e)
      message.error('保存文件被取消或失败')
    }
  } else {
    try {
      const blob = new Blob([uint8Array], { type: mimeType })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      message.success('文件已下载到浏览器默认文件夹')
    } catch (e: any) {
      console.error(e)
      message.error('导出失败: ' + e.message)
    }
  }
}
