import fujianIcon from '@/assets/life/provinces/high-precision/fujian.svg'
import heilongjiangIcon from '@/assets/life/provinces/high-precision/heilongjiang.svg'
import hubeiIcon from '@/assets/life/provinces/high-precision/hubei.svg'
import liaoningIcon from '@/assets/life/provinces/high-precision/liaoning.svg'
import shandongIcon from '@/assets/life/provinces/high-precision/shandong.svg'

type Province = {
  name: string
  icon: string
}

const provinceByCity: Record<string, Province> = {
  厦门: { name: '福建', icon: fujianIcon },
  泉州: { name: '福建', icon: fujianIcon },
  沈阳: { name: '辽宁', icon: liaoningIcon },
  哈尔滨: { name: '黑龙江', icon: heilongjiangIcon },
  周村: { name: '山东', icon: shandongIcon },
  武汉: { name: '湖北', icon: hubeiIcon },
}

export function getLifeProvince(city?: string): Province | undefined {
  return city ? provinceByCity[city] : undefined
}
