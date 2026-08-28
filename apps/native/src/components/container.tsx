import { type PropsWithChildren } from "react";
import { ViewProps, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
  scroll?: boolean;
};

export function Container({ children, style, scroll = true, ...props }: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();
  const bgColor = "#ffffff";

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[{ flex: 1, backgroundColor: bgColor }, style]}
      {...props}
    >
      {scroll ? (
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
