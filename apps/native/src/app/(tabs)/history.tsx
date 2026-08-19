import { Card } from "heroui-native";
import { Text, View, ScrollView } from "react-native";
import { Container } from "@/components/container";

export default function History() {
  return (
    <Container className="p-6">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-6">Recent Attendance</Text>
        
        <View className="gap-4">
          <Card variant="secondary" className="p-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-foreground font-semibold text-lg">CS301 - Data Structures</Text>
              <Text className="text-success font-medium">Present</Text>
            </View>
            <Text className="text-muted-foreground text-sm">Mon, Aug 19 • 10:00 AM</Text>
          </Card>

          <Card variant="secondary" className="p-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-foreground font-semibold text-lg">CS305 - OS</Text>
              <Text className="text-destructive font-medium">Absent</Text>
            </View>
            <Text className="text-muted-foreground text-sm">Fri, Aug 16 • 11:30 AM</Text>
          </Card>
        </View>
      </ScrollView>
    </Container>
  );
}
