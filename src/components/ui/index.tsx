/**
 * The design system's public surface.
 *
 * Screens import from `@/components/ui` and nothing else in this folder, so a
 * primitive can be reshaped, split or renamed without touching a single screen.
 */

export {
  Display,
  DisplayText,
  Label,
  Text,
  UrduText,
  BookTitle,
  type DisplayProps,
  type DisplaySize,
  type LabelProps,
  type TextTone,
} from './Text';

export { Icon, IconTile, IconFrame, type IconProps, type IconTone, type IconTileTone, type LucideIcon } from './Icon';

export {
  Button,
  IconButton,
  TextButton,
  FloatingAction,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './Button';

export {
  Card,
  PressableCard,
  Divider,
  SectionHeader,
  Callout,
  type CalloutTone,
  type CardProps,
  type CardTone,
} from './Surface';

export { Chip, ChipRow, ChipWrap, Badge, Tag, type BadgeTone, type ChipProps } from './Chip';

export {
  Field,
  TextField,
  ReadOnlyField,
  SelectField,
  SearchField,
  type SearchFieldProps,
  type TextFieldProps,
} from './Field';

export { Toggle, RadioDot, Checkbox, type SelectionProps, type ToggleProps } from './Toggle';

export {
  ProgressBar,
  CoverProgress,
  SliderTrack,
  StatTile,
  StreakBars,
  type ProgressBarProps,
  type StatTileProps,
} from './Progress';

export {
  SegmentedControl,
  type SegmentOption,
  type SegmentedControlProps,
} from './SegmentedControl';

export { SettingsGroup, SettingsRow, type SettingsRowProps } from './SettingsGroup';

export { ViewToggle, type ViewMode } from './ViewToggle';

export { Sheet, SheetSection, useSheet, type SheetProps } from './Sheet';

export { EmptyState, DashedShelf, type EmptyStateProps } from './EmptyState';

export {
  BookCover,
  Avatar,
  coverHeight,
  initialsFrom,
  COVER_RATIO,
  type AvatarProps,
  type BookCoverProps,
} from './BookCover';

export {
  LinearGradient,
  RadialGlow,
  HeaderWash,
  DiagonalTexture,
  type GradientStop,
} from './Gradient';

export { SkeletonPulse, SkeletonBone, SkeletonCover, SkeletonRail } from './Skeleton';

export {
  CircularProgress,
  CircularProgressCombined,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
  CircularProgressValueText,
  type CircularProgressProps,
} from './CircularProgress';
