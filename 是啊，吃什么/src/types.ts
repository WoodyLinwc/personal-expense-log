export type Category = 'food' | 'work' | 'family' | 'activity' | 'shopping' | 'other';

export type CustomColor = 'orange' | 'blue' | 'pink' | 'green' | 'purple' | 'gray' | 'red' | 'yellow' | 'teal' | 'indigo';

export interface RecordItem {
  id: string;
  description: string;
  cost: number;
  category?: Category;
  customColor?: CustomColor;
  createdAt: number;
}

export type RecordsData = Record<string, RecordItem[]>;

export const CUSTOM_COLORS: Record<CustomColor, string> = {
  orange: "bg-orange-100 text-orange-800",
  blue: "bg-blue-100 text-blue-800",
  pink: "bg-pink-100 text-pink-800",
  green: "bg-green-100 text-green-800",
  purple: "bg-purple-100 text-purple-800",
  gray: "bg-gray-100 text-gray-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  teal: "bg-teal-100 text-teal-800",
  indigo: "bg-indigo-100 text-indigo-800",
};

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'food', label: '🍔 餐饮' },
  { id: 'work', label: '💻 工作' },
  { id: 'family', label: '🏠 家庭' },
  { id: 'activity', label: '🏃 活动' },
  { id: 'shopping', label: '🛒 购物' },
  { id: 'other', label: '📦 其他' }
];

export const CATEGORY_COLORS: Record<Category, string> = {
  food: "bg-orange-100 text-orange-800",
  work: "bg-blue-100 text-blue-800",
  family: "bg-pink-100 text-pink-800",
  activity: "bg-green-100 text-green-800",
  shopping: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
};
