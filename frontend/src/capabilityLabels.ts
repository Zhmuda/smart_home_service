import type { Operator } from './types'

const INSTANCE_LABELS: Record<string, string> = {
  on: 'Включение',
  brightness: 'Яркость',
  volume: 'Громкость',
  channel: 'Канал',
  temperature: 'Температура',
  temperature_k: 'Цветовая температура',
  humidity: 'Влажность',
  hsv: 'Цвет',
  rgb: 'Цвет',
  scene: 'Световая сцена',
  motion: 'Движение',
  open: 'Открытие',
  button: 'Нажатие кнопки',
  vibration: 'Вибрация',
  smoke: 'Дым',
  gas: 'Газ',
  water_leak: 'Утечка воды',
  water_level: 'Уровень воды',
  battery_level: 'Заряд батареи',
  co2_level: 'Уровень CO2',
  'pm2.5_density': 'Частицы PM2.5',
  pm10_density: 'Частицы PM10',
  pressure: 'Давление',
  tvoc: 'Летучие вещества (TVOC)',
  voltage: 'Напряжение',
  power: 'Мощность',
  amperage: 'Сила тока',
  voice_activity: 'Голосовая активность',
  work_mode: 'Режим работы',
  thermostat: 'Режим термостата',
  fan_speed: 'Скорость вентилятора',
  cleanup_mode: 'Режим уборки',
  input_source: 'Источник сигнала',
  swing: 'Направление воздуха',
  program: 'Программа',
  mute: 'Без звука',
  pause: 'Пауза',
  backlight: 'Подсветка',
  controls_locked: 'Блокировка управления',
  ionization: 'Ионизация',
  keep_warm: 'Подогрев',
  child_lock: 'Детский замок',
}

const CATEGORY_LABELS: Record<string, string> = {
  'devices.capabilities.on_off': 'Включение',
  'devices.capabilities.color_setting': 'Свет',
  'devices.capabilities.range': 'Уровень',
  'devices.capabilities.mode': 'Режим',
  'devices.capabilities.toggle': 'Переключатель',
  'devices.capabilities.video_stream': 'Видео',
  'devices.properties.float': 'Датчик',
  'devices.properties.event': 'Событие',
}

export function humanize(s: string): string {
  return s.replace(/_/g, ' ')
}

export function getCategoryLabel(capabilityType: string): string {
  return CATEGORY_LABELS[capabilityType] ?? humanize(capabilityType.split('.').pop() ?? capabilityType)
}

export function getStateLabel(_capabilityType: string, instance: string): string {
  return INSTANCE_LABELS[instance] ?? humanize(instance)
}

const OPERATOR_LABELS: Record<Operator, string> = {
  eq: 'равно',
  ne: 'не равно',
  gt: 'больше',
  gte: 'больше или равно',
  lt: 'меньше',
  lte: 'меньше или равно',
}

export function getOperatorLabel(op: Operator): string {
  return OPERATOR_LABELS[op]
}

const STATUS_LABELS: Record<string, string> = {
  ok: 'выполнен',
  error: 'ошибка',
  condition_not_met: 'условие не выполнено',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}
