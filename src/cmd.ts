import { execSync } from 'child_process'

export const GetToken = (secret: string): string => {
  if (!secret) {
    return ''
  }

  const buffer = execSync(`oathtool --totp --base32 "${secret}"`)
  return buffer.toString()
}
