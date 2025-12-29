"use client";

import React from "react";
import { Stack, Title, Paper, Grid, TextInput } from "@mantine/core";

type DetailsStepProps = {
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  mobile: string;
  setMobile: (val: string) => void;
};

export const DetailsStep = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  mobile,
  setMobile,
}: DetailsStepProps) => {
  return (
    <Stack mt="lg">
      <Title order={4}>User Information</Title>
      <Paper withBorder p="lg" radius="md">
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="First Name"
              value={firstName}
              onChange={(e) => {
                const val = e.currentTarget.value.replace(/[^A-Za-z\s'-]/g, "");
                setFirstName(val);
              }}
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Last Name"
              value={lastName}
              onChange={(e) => {
                const val = e.currentTarget.value.replace(/[^A-Za-z\s'-]/g, "");
                setLastName(val);
              }}
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              type="email"
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Mobile Number"
              placeholder="09xxxxxxxxx"
              value={mobile}
              onChange={(e) => {
                const val = e.currentTarget.value.replace(/\D/g, "");
                if (val.length <= 11) setMobile(val);
              }}
              required
            />
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
};
