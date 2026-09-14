import { type PropsWithChildren } from "react";
import { ViewProps, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useResponsive } from "@/hooks/use-responsive";

type Props = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

export function Container({
  children,
  style,
  scroll = true,
  padded = true,
  ...props
}: PropsWithChildren<Props>) {
  const { colors } = useAppTheme();
  const { bottomInset, isSmallHeight, fontScale } = useResponsive();

  // If the device is small in height or font scaling is increased, force-enable scrolling
  // so critical actions and content are never pushed off-screen or clipped.
  const shouldScroll = scroll || isSmallHeight || fontScale > 1.15;

  const contentPaddingBottom = Math.max(bottomInset, 16) + 12;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        {
          flex: 1,
          backgroundColor: colors.stage,
        },
        style,
      ]}
      {...props}
    >
      {shouldScroll ? (
        <KeyboardAwareScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: contentPaddingBottom,
            paddingHorizontal: padded ? 16 : 0,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            paddingBottom: contentPaddingBottom,
            paddingHorizontal: padded ? 16 : 0,
          }}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
