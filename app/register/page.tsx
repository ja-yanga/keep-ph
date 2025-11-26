"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Grid,
  Group,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Card,
  Badge,
  Table,
  Radio,
  ScrollArea,
} from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";

export default function RegisterMailroomPage() {
  const [firstName, setFirstName] = useState("Juan");
  const [lastName, setLastName] = useState("Dela Cruz");
  const [email] = useState("juan.delacruz@example.com");
  const [mobile, setMobile] = useState("09171234567");

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>("Personal");

  const [lockerQty, setLockerQty] = useState<number | undefined>(1);
  const [months, setMonths] = useState<number | undefined>(12);
  const [notes, setNotes] = useState("");

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F7FAFC",
        fontFamily: "Inter, sans-serif",
        color: "#1A202C",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />

      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg" style={{ textAlign: "left" }}>
            Register Mailroom Service
          </Title>

          <Stack spacing="xl">
            {/* Step 1: User Info */}
            <Paper withBorder p="lg" radius="md">
              <Group align="flex-start" mb="md">
                <Badge color="blue" variant="filled" size="lg">
                  1
                </Badge>
                <Title order={4}>User Info</Title>
              </Group>

              <Grid>
                <Grid.Col md={6}>
                  <TextInput
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col md={6}>
                  <TextInput
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.currentTarget.value)}
                  />
                </Grid.Col>

                <Grid.Col md={6}>
                  <TextInput label="Email" value={email} readOnly />
                </Grid.Col>

                <Grid.Col md={6}>
                  <TextInput
                    label="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.currentTarget.value)}
                  />
                </Grid.Col>

                <Grid.Col md={12}>
                  <TextInput label="Telephone Number (Optional)" />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Step 2: Mailroom & Plan Selection */}
            <Paper withBorder p="lg" radius="md">
              <Group align="flex-start" mb="md">
                <Badge color="blue" variant="filled" size="lg">
                  2
                </Badge>
                <Title order={4}>Mailroom &amp; Plan Selection</Title>
              </Group>

              <Stack spacing="lg">
                <Box>
                  <Text weight={600} mb="sm">
                    Select Mailroom Location
                  </Text>
                  <ScrollArea style={{ maxHeight: 220 }}>
                    <Table verticalSpacing="sm" highlightOnHover>
                      <thead>
                        <tr>
                          <th></th>
                          <th>Location Name</th>
                          <th>Region / City</th>
                          <th>Barangay</th>
                          <th>Zip</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            id: "greenhills",
                            name: "Keep PH Greenhills",
                            region: "Metro Manila / San Juan",
                            barangay: "Greenhills",
                            zip: "1503",
                          },
                          {
                            id: "bgc",
                            name: "Keep PH BGC",
                            region: "Metro Manila / Taguig",
                            barangay: "Bonifacio Global City",
                            zip: "1634",
                          },
                        ].map((loc) => (
                          <tr key={loc.id}>
                            <td style={{ width: 40 }}>
                              <Radio
                                checked={selectedLocation === loc.id}
                                onChange={() => setSelectedLocation(loc.id)}
                                value={loc.id}
                                name="mailroom-location"
                              />
                            </td>
                            <td>{loc.name}</td>
                            <td>{loc.region}</td>
                            <td>{loc.barangay}</td>
                            <td>{loc.zip}</td>
                            <td>
                              <Button variant="subtle" compact>
                                View on Map
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </ScrollArea>
                </Box>

                <Box>
                  <Text weight={600} mb="sm">
                    Select Your Plan
                  </Text>

                  <Grid>
                    <Grid.Col xs={12} md={6} lg={3}>
                      <Card
                        withBorder
                        shadow="sm"
                        radius="md"
                        style={{ height: "100%" }}
                      >
                        <Stack style={{ height: "100%" }}>
                          <Text weight={700}>Free</Text>
                          <Text size="sm" color="dimmed">
                            Earn while you refer
                          </Text>
                          <Text weight={700} size="xl">
                            Free
                          </Text>
                          <Stack spacing={6} style={{ flex: 1 }}>
                            <Text size="sm" color="dimmed">
                              Affiliate link access
                            </Text>
                            <Text size="sm" color="dimmed">
                              5% cash back per subscriber
                            </Text>
                            <Text size="sm" color="dimmed">
                              Track your referrals
                            </Text>
                            <Text size="sm" color="gray">
                              No mail services
                            </Text>
                          </Stack>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPlan("Free")}
                          >
                            Select
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>

                    <Grid.Col xs={12} md={6} lg={3}>
                      <Card withBorder shadow="sm" radius="md">
                        <Stack style={{ height: "100%" }}>
                          <Text weight={700}>Digital</Text>
                          <Text size="sm" color="dimmed">
                            For individuals who just need their mail digitized
                          </Text>
                          <Text weight={700} size="xl">
                            ₱299
                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                              /month
                            </span>
                          </Text>
                          <Stack spacing={6} style={{ flex: 1 }}>
                            <Text size="sm" color="dimmed">
                              Mail scanning &amp; digitization
                            </Text>
                            <Text size="sm" color="dimmed">
                              5GB digital storage
                            </Text>
                            <Text size="sm" color="dimmed">
                              7-day physical retention
                            </Text>
                            <Text size="sm" color="dimmed">
                              ~5,000 scanned pages
                            </Text>
                          </Stack>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPlan("Digital")}
                          >
                            Select
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>

                    <Grid.Col xs={12} md={6} lg={3}>
                      <Card
                        withBorder
                        shadow="md"
                        radius="md"
                        style={{ borderColor: "#26316D" }}
                      >
                        <Stack style={{ height: "100%" }}>
                          <Badge color="blue" variant="filled">
                            Popular
                          </Badge>
                          <Text weight={700} color="#26316D">
                            Personal
                          </Text>
                          <Text size="sm" color="dimmed">
                            Complete mail management solution
                          </Text>
                          <Text weight={700} size="xl">
                            ₱499
                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                              /month
                            </span>
                          </Text>
                          <Stack spacing={6} style={{ flex: 1 }}>
                            <Text size="sm" color="dimmed">
                              Everything in Digital
                            </Text>
                            <Text size="sm" color="dimmed">
                              20GB digital storage
                            </Text>
                            <Text size="sm" color="dimmed">
                              Parcel handling
                            </Text>
                            <Text size="sm" color="dimmed">
                              90-day physical retention
                            </Text>
                          </Stack>
                          <Button
                            fullWidth
                            onClick={() => setSelectedPlan("Personal")}
                          >
                            Select
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>

                    <Grid.Col xs={12} md={6} lg={3}>
                      <Card withBorder shadow="sm" radius="md">
                        <Stack style={{ height: "100%" }}>
                          <Text weight={700}>Business</Text>
                          <Text size="sm" color="dimmed">
                            Professional virtual office solution
                          </Text>
                          <Text weight={700} size="xl">
                            ₱2,999
                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                              /month
                            </span>
                          </Text>
                          <Stack spacing={6} style={{ flex: 1 }}>
                            <Text size="sm" color="dimmed">
                              Everything in Personal
                            </Text>
                            <Text size="sm" color="dimmed">
                              200GB digital storage
                            </Text>
                            <Text size="sm" color="dimmed">
                              Virtual office address
                            </Text>
                          </Stack>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPlan("Business")}
                          >
                            Select
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Box>
              </Stack>
            </Paper>

            {/* Step 3: Locker Info & Summary */}
            <Paper withBorder p="lg" radius="md">
              <Group align="flex-start" mb="md">
                <Badge color="blue" variant="filled" size="lg">
                  3
                </Badge>
                <Title order={4}>Locker Information &amp; Summary</Title>
              </Group>

              <Grid>
                <Grid.Col lg={8}>
                  <Stack spacing="md">
                    <Title order={5}>Locker Details</Title>
                    <Grid>
                      <Grid.Col md={4}>
                        <NumberInput
                          label="Locker Quantity"
                          min={1}
                          value={lockerQty}
                          onChange={(val) => setLockerQty(val)}
                        />
                      </Grid.Col>

                      <Grid.Col md={4}>
                        <NumberInput
                          label="Number of Months"
                          min={1}
                          value={months}
                          onChange={(val) => setMonths(val)}
                        />
                      </Grid.Col>

                      <Grid.Col md={4}>
                        <TextInput
                          label="Total Expiration Date"
                          value="Calculated date"
                          readOnly
                        />
                      </Grid.Col>
                    </Grid>

                    <Box>
                      <Text size="sm" weight={600} mb="xs">
                        Optional Note
                      </Text>
                      <Textarea
                        placeholder="Preferred locker dimensions, or promo info"
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        minRows={3}
                      />
                    </Box>
                  </Stack>
                </Grid.Col>

                <Grid.Col lg={4}>
                  <Box>
                    <Paper
                      withBorder
                      p="md"
                      radius="md"
                      style={{ backgroundColor: "#F8FAFC" }}
                    >
                      <Title order={5} mb="sm">
                        Registration Summary
                      </Title>
                      <Stack spacing={8}>
                        <Group position="apart">
                          <Text color="dimmed">Full Name:</Text>
                          <Text weight={700}>
                            {firstName} {lastName}
                          </Text>
                        </Group>
                        <Group position="apart">
                          <Text color="dimmed">Contact:</Text>
                          <Text weight={700}>{mobile}</Text>
                        </Group>
                        <Group position="apart">
                          <Text color="dimmed">Mailroom:</Text>
                          <Text weight={700}>{selectedLocation ?? "—"}</Text>
                        </Group>
                        <Group position="apart">
                          <Text color="dimmed">Plan:</Text>
                          <Text weight={700}>{selectedPlan}</Text>
                        </Group>
                        <Group position="apart">
                          <Text color="dimmed">Lockers:</Text>
                          <Text weight={700}>
                            {lockerQty} x {months} months
                          </Text>
                        </Group>
                        <Group position="apart">
                          <Text color="dimmed">Expires on:</Text>
                          <Text weight={700}>May 23, 2025</Text>
                        </Group>
                      </Stack>

                      <Box
                        mt="md"
                        pt="md"
                        style={{ borderTop: "1px solid #E6EEF6" }}
                      >
                        <Text size="sm" color="dimmed">
                          Referral Code (Optional)
                        </Text>
                        <Group mt="xs">
                          <TextInput
                            placeholder="Enter code"
                            style={{ flex: 1 }}
                          />
                          <Button variant="outline">Apply</Button>
                        </Group>
                      </Box>
                    </Paper>
                  </Box>
                </Grid.Col>
              </Grid>
            </Paper>

            <Group position="right" mt="md">
              <Button
                size="md"
                radius="lg"
                style={{ backgroundColor: "#26316D", color: "#fff" }}
              >
                Submit Registration
              </Button>
            </Group>
          </Stack>
        </Container>
      </main>

      <Footer />
    </Box>
  );
}
