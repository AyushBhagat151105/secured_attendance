import { Card, Button } from "heroui-native";
import { Text, View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { Container } from "@/components/container";

export default function Home() {
  const { data: session } = authClient.useSession();

  return (
    <Container className="p-6">
      <View className="flex-1">
        <View className="mb-8 mt-4">
          <Text className="text-3xl font-bold text-foreground mb-1">
            Welcome back,
          </Text>
          <Text className="text-xl text-muted-foreground">
            {session?.user.name || "Student"}
          </Text>
        </View>

        <Card variant="secondary" className="p-6 items-start mb-6">
          <Text className="text-primary-foreground/80 mb-1 font-medium">Current Streak</Text>
          <Text className="text-4xl font-bold text-primary-foreground">🔥 5 Days</Text>
        </Card>
        
        <Card variant="secondary" className="p-6 items-start">
          <Text className="text-foreground font-semibold text-lg mb-2">Today's Schedule</Text>
          <Text className="text-muted-foreground">No upcoming classes today.</Text>
        </Card>

        <View className="flex-1 justify-end">
          <Button 
            onPress={() => authClient.signOut()} 
            variant="ghost" 
            className="text-destructive"
          >
            <Button.Label>Sign Out</Button.Label>
          </Button>
        </View>
      </View>
    </Container>
  );
}
