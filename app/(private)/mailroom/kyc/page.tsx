"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  NativeSelect,
  TextInput,
  FileInput,
  Image,
  Badge,
  Alert,
  Modal,
  Grid,
  rem,
  Divider,
  Center,
  Loader,
  SimpleGrid,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconId,
  IconCheck,
  IconHourglass,
  IconX,
  IconCamera,
  IconArrowRight,
  IconArrowLeft,
  IconZoomIn,
  IconUser,
  IconMapPin,
  IconAlertCircle,
  IconFileCertificate, // Added for document details
} from "@tabler/icons-react";

// add your navbar/footer components (adjust import paths if your project uses a different alias)
import { getStatusFormat } from "@/utils/helper";
import { FORM_NAME, IDENTITY_VERIFICATION_KYC } from "@/utils/constants";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

function maskId(id?: string, visible = 4) {
  if (!id) return "";
  if (id.length <= visible) return "*".repeat(id.length);
  return `${"*".repeat(id.length - visible)}${id.slice(-visible)}`;
}

export default function KycPage() {
  // State for the main form
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [docType, setDocType] = useState<string>("Government ID");
  const [docNumber, setDocNumber] = useState<string>("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"NONE" | "SUBMITTED" | "VERIFIED">(
    "NONE",
  );
  // NEW: name & address snapshot fields
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [addressLine1, setAddressLine1] = useState<string>("");
  const [addressLine2, setAddressLine2] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [postal, setPostal] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>(""); // YYYY-MM-DD

  // NEW: submission state / server error
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // modal state for image preview
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  // confirm modal for submit
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  // load real KYC status from API on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const r = await fetch(API_ENDPOINTS.user.kyc, {
          credentials: "include",
        });
        if (!r.ok) {
          if (mounted) setStatus("NONE");
          if (mounted) setInitialLoading(false);
          return;
        }
        const payload = await r.json();
        const row = payload?.kyc;
        if (!mounted || !row) {
          if (mounted) setStatus("NONE");
          if (mounted) setInitialLoading(false);
          return;
        }

        // Set status based on user_kyc_status
        const kycStatus = row.user_kyc_status;
        if (kycStatus === "VERIFIED") setStatus("VERIFIED");
        else if (kycStatus === "SUBMITTED") setStatus("SUBMITTED");
        else setStatus("NONE");

        // Populate form fields from the data
        setDocType(row.user_kyc_id_document_type ?? "Government ID");
        setDocNumber(row.user_kyc_id_number ?? "");
        setFirstName(row.user_kyc_first_name ?? "");
        setLastName(row.user_kyc_last_name ?? "");
        setBirthDate(row.user_kyc_date_of_birth ?? "");
        setFrontPreview(row.user_kyc_id_front_url ?? null);
        setBackPreview(row.user_kyc_id_back_url ?? null);

        // For address, need to fetch from user_kyc_address_table if separate
        // But since the route doesn't return address, perhaps fetch separately or assume not populated on load for now
        // TODO: If address needs to be shown, add fetch for address
      } catch {
        if (mounted) setStatus("NONE");
      } finally {
        if (mounted) setInitialLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isLocked = status === "SUBMITTED" || status === "VERIFIED";

  // Submit handler: POST FormData to the API route
  const handleSubmit = async () => {
    // Added address fields to validation check
    if (
      !docNumber ||
      !frontFile ||
      !backFile ||
      !firstName ||
      !lastName ||
      !addressLine1 ||
      !city ||
      !region ||
      !postal ||
      !birthDate ||
      submitting
    )
      return;

    setSubmitting(true);
    setServerError(null);
    try {
      const fd = new FormData();
      fd.append("document_type", docType);
      fd.append("user_kyc_id_number", docNumber);
      // append name/address snapshot
      fd.append("first_name", firstName);
      fd.append("last_name", lastName);
      fd.append("full_name", `${firstName} ${lastName}`.trim());
      fd.append("address_line1", addressLine1);
      fd.append("address_line2", addressLine2);
      fd.append("city", city);
      fd.append("region", region);
      fd.append("postal", postal);
      fd.append("birth_date", birthDate);
      fd.append("front", frontFile as Blob);
      fd.append("back", backFile as Blob);

      const res = await fetch(API_ENDPOINTS.user.kyc, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(
          typeof json?.error === "string"
            ? json.error
            : json?.error?.message || "Failed to submit. Please try again.",
        );
        return;
      }
      // success → reflect SUBMITTED state
      setStatus("SUBMITTED");
      setFrontFile(null);
      setBackFile(null);
      setServerError(null);
    } catch {
      console.error("KYC submit error");
      setServerError("Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  // can only submit when not already submitted/verified
  const canSubmit =
    status === "NONE" &&
    !!docNumber &&
    !!frontFile &&
    !!backFile &&
    !!firstName &&
    !!lastName &&
    !!addressLine1 &&
    !!city &&
    !!region &&
    !!birthDate &&
    !!postal;

  // Existing useEffects for file previews
  useEffect(() => {
    if (frontFile) {
      const u = URL.createObjectURL(frontFile);
      setFrontPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setFrontPreview(null);
  }, [frontFile]);

  useEffect(() => {
    if (backFile) {
      const u = URL.createObjectURL(backFile);
      setBackPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setBackPreview(null);
  }, [backFile]);

  // Function to open the modal with the correct image
  const handlePreviewClick = (src: string) => {
    setModalImageSrc(src);
    open();
  };

  const getStatusIcon = (status: string) => {
    if (status === "VERIFIED") return IconCheck;
    if (status === "SUBMITTED") return IconHourglass;
    return IconX;
  };

  const statusTextMap = {
    VERIFIED: "Verified",
    SUBMITTED: "Under review",
    REJECTED: "Rejected",
    NONE: "Not submitted",
  } as const;

  const fullAddress = [addressLine1, addressLine2, city, region, postal]
    .filter(Boolean)
    .join(", ");

  const StatusIconComponent = getStatusIcon(status);

  return (
    <PrivateMainLayout>
      {initialLoading ? (
        <Center h="90vh">
          <Loader />
        </Center>
      ) : (
        <Container size="sm" py="xl">
          <Stack gap="xl">
            <Group
              justify="space-between"
              align="center"
              style={{ width: "100%" }}
            >
              <Title order={2} fw={700} style={{ margin: 0 }}>
                <Group gap="xs" align="center">
                  <IconId size={30} />
                  {IDENTITY_VERIFICATION_KYC.section_header.title}
                </Group>
              </Title>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => router.back()}
                aria-label="Go back"
              >
                Back
              </Button>
            </Group>

            {/* === STATUS SECTION === */}
            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Text>
                  {IDENTITY_VERIFICATION_KYC.section_header.sub_title}
                </Text>

                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    {IDENTITY_VERIFICATION_KYC.section_header.status}
                  </Text>
                  <Badge
                    color={getStatusFormat(status)}
                    size="lg"
                    variant="light"
                    leftSection={<StatusIconComponent size={14} />}
                  >
                    {statusTextMap[status as keyof typeof statusTextMap]}
                  </Badge>
                </Group>
              </Stack>
            </Paper>

            {/* === UPLOAD FORM SECTION (Stacked vertical flow) === */}
            {status === "NONE" && (
              <Paper withBorder p="lg" radius="md">
                <Stack gap="xl">
                  <Title order={3} fw={600}>
                    {
                      IDENTITY_VERIFICATION_KYC.section_form.section_header
                        .title
                    }
                  </Title>

                  <Alert
                    icon={<IconAlertCircle size={18} />}
                    color="blue"
                    variant="light"
                  >
                    <Text size="sm" fw={600}>
                      {
                        IDENTITY_VERIFICATION_KYC.section_form.section_header
                          .alert_title
                      }
                    </Text>
                    <Text size="sm">
                      {
                        IDENTITY_VERIFICATION_KYC.section_form.section_header
                          .alert_description
                      }
                    </Text>
                  </Alert>

                  {/* 1. DOCUMENT TYPE/NUMBER (Full Width) */}
                  <Paper withBorder p="md" radius="md">
                    <Stack gap="md">
                      <Title order={4} fw={600}>
                        {
                          IDENTITY_VERIFICATION_KYC.section_form
                            .section_form_title.details
                        }
                      </Title>
                      <NativeSelect
                        data={["Government ID", "Passport", "Driver's License"]}
                        value={docType}
                        onChange={(e) => setDocType(e.currentTarget.value)}
                        label="Document Type"
                        required
                        disabled={isLocked}
                      />

                      <TextInput
                        label="Document Number"
                        placeholder="Enter ID number"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.currentTarget.value)}
                        required
                        disabled={isLocked}
                      />
                    </Stack>
                  </Paper>

                  {/* 2. PERSONAL DETAILS SNAPSHOT (Full Width) */}
                  <Paper withBorder p="md" radius="md">
                    <Stack gap="md">
                      <Title order={4} fw={600}>
                        {
                          IDENTITY_VERIFICATION_KYC.section_form
                            .section_form_title.personal
                        }
                      </Title>
                      <Group grow gap="md">
                        <TextInput
                          label={FORM_NAME.first_name}
                          placeholder={FORM_NAME.first_name}
                          value={firstName}
                          onChange={(e) => setFirstName(e.currentTarget.value)}
                          required
                          leftSection={<IconUser size={rem(16)} />}
                          disabled={isLocked}
                        />
                        <TextInput
                          label={FORM_NAME.last_name}
                          placeholder={FORM_NAME.last_name}
                          value={lastName}
                          onChange={(e) => setLastName(e.currentTarget.value)}
                          required
                          disabled={isLocked}
                        />
                        <TextInput
                          label={FORM_NAME.date_of_birth}
                          placeholder="YYYY-MM-DD"
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.currentTarget.value)}
                          required
                          disabled={isLocked}
                        />
                      </Group>

                      <Divider
                        labelPosition="left"
                        label={
                          <Group gap="xs">
                            <IconMapPin size={16} /> Address
                          </Group>
                        }
                        my="xs"
                      />

                      <TextInput
                        label={FORM_NAME.address_line_one}
                        placeholder="Street, building"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.currentTarget.value)}
                        required
                        disabled={isLocked}
                      />
                      <TextInput
                        label={FORM_NAME.address_line_two}
                        placeholder="Unit / Barangay"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.currentTarget.value)}
                        disabled={isLocked}
                      />

                      <Group grow>
                        <TextInput
                          label={FORM_NAME.city}
                          placeholder={FORM_NAME.city}
                          value={city}
                          onChange={(e) => setCity(e.currentTarget.value)}
                          required
                          disabled={isLocked}
                        />
                        <TextInput
                          label={FORM_NAME.region}
                          placeholder={FORM_NAME.region}
                          value={region}
                          onChange={(e) => setRegion(e.currentTarget.value)}
                          required
                          disabled={isLocked}
                        />
                        <TextInput
                          label={FORM_NAME.postal}
                          placeholder={FORM_NAME.postal}
                          value={postal}
                          onChange={(e) =>
                            setPostal(e.currentTarget.value.replace(/\D/g, ""))
                          }
                          inputMode="numeric"
                          pattern="\d*"
                          required
                          disabled={isLocked}
                        />
                      </Group>
                    </Stack>
                  </Paper>

                  {/* 3. FILE UPLOADS (Full Width) */}
                  <Paper withBorder p="md" radius="md">
                    <Stack gap="md">
                      <Title order={4} fw={600}>
                        {
                          IDENTITY_VERIFICATION_KYC.section_form
                            .section_form_title.upload_id
                        }
                      </Title>
                      <Grid>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                          <FileInput
                            label={FORM_NAME.front}
                            placeholder="Choose front image"
                            accept="image/*"
                            value={frontFile}
                            onChange={setFrontFile}
                            leftSection={<IconArrowRight size={rem(14)} />}
                            required
                            disabled={isLocked}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                          <FileInput
                            label={FORM_NAME.back}
                            placeholder="Choose back image"
                            accept="image/*"
                            value={backFile}
                            onChange={setBackFile}
                            leftSection={<IconArrowLeft size={rem(14)} />}
                            required
                            disabled={isLocked}
                          />
                        </Grid.Col>
                      </Grid>

                      <Text size="xs" c="dimmed">
                        Supported formats: JPG, PNG. Max file size: 5MB. Clear,
                        well-lit images are required.
                      </Text>

                      {/* Inline previews inside upload section */}
                      <Divider my="sm" label="Previews" labelPosition="left" />
                      <Group grow wrap="nowrap" align="flex-start">
                        {frontPreview ? (
                          <Paper
                            withBorder
                            p="sm"
                            radius="md"
                            onClick={() => handlePreviewClick(frontPreview)}
                            style={{ cursor: "pointer", flexBasis: "50%" }}
                          >
                            <Stack gap="xs" align="center">
                              <Image
                                src={frontPreview}
                                alt="front preview"
                                fit="contain"
                                mah={120}
                                w="100%"
                                radius="sm"
                              />
                              <Group justify="center" gap="xs">
                                <IconCamera size={18} />
                                <Text size="sm" fw={600}>
                                  Front ID
                                </Text>
                                <IconZoomIn size={16} />
                              </Group>
                            </Stack>
                          </Paper>
                        ) : (
                          <Paper
                            withBorder
                            p="xl"
                            radius="md"
                            style={{ flexBasis: "50%" }}
                          >
                            <Text c="dimmed" size="sm" ta="center">
                              Front ID preview will appear here.
                            </Text>
                          </Paper>
                        )}

                        {backPreview ? (
                          <Paper
                            withBorder
                            p="sm"
                            radius="md"
                            onClick={() => handlePreviewClick(backPreview)}
                            style={{ cursor: "pointer", flexBasis: "50%" }}
                          >
                            <Stack gap="xs" align="center">
                              <Image
                                src={backPreview}
                                alt="back preview"
                                fit="contain"
                                mah={120}
                                w="100%"
                                radius="sm"
                              />
                              <Group justify="center" gap="xs">
                                <IconCamera size={18} />
                                <Text size="sm" fw={600}>
                                  Back ID
                                </Text>
                                <IconZoomIn size={16} />
                              </Group>
                            </Stack>
                          </Paper>
                        ) : (
                          <Paper
                            withBorder
                            p="xl"
                            radius="md"
                            style={{ flexBasis: "50%" }}
                          >
                            <Text c="dimmed" size="sm" ta="center">
                              Back ID preview will appear here.
                            </Text>
                          </Paper>
                        )}
                      </Group>
                    </Stack>
                  </Paper>

                  {/* === ERROR & ACTION BUTTONS === */}
                  {serverError && (
                    <Alert
                      icon={<IconAlertCircle size={18} />}
                      color="red"
                      title="Submission Error"
                    >
                      {serverError}
                    </Alert>
                  )}

                  <Group justify="flex-end" mt="md">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // cancel / reset
                        setDocNumber("");
                        setFrontFile(null);
                        setBackFile(null);
                        setFirstName("");
                        setLastName("");
                        setAddressLine1("");
                        setAddressLine2("");
                        setCity("");
                        setRegion("");
                        setPostal("");
                        setBirthDate("");
                        setServerError(null);
                      }}
                      disabled={isLocked}
                    >
                      Reset Form
                    </Button>
                    <Button
                      onClick={openConfirm}
                      disabled={!canSubmit || submitting}
                      loading={submitting}
                      rightSection={<IconArrowRight size={16} />}
                    >
                      Submit for Verification
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Display snapshot if already submitted (IMPROVED UI) */}
            {status !== "NONE" && (
              <Paper withBorder p="lg" radius="md">
                <Stack gap="md">
                  <Title order={3} fw={600}>
                    {status === "VERIFIED"
                      ? "Verified Information"
                      : "Submitted Information Snapshot"}
                  </Title>

                  {/* Status Alert */}
                  <Alert
                    color={status === "VERIFIED" ? "green" : "yellow"}
                    title={
                      status === "VERIFIED"
                        ? "Verification Complete"
                        : "Documents Under Review"
                    }
                    icon={
                      status === "VERIFIED" ? (
                        <IconCheck size={18} />
                      ) : (
                        <IconHourglass size={18} />
                      )
                    }
                  >
                    {status === "VERIFIED"
                      ? "Your identity is verified. You can now access all services."
                      : "We are currently reviewing your submitted documents. Please check back later."}
                  </Alert>

                  {/* SimpleGrid for Snapshot Details */}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                    {/* Document Details Card */}
                    <Paper withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Group gap="xs">
                          <IconFileCertificate size={20} />
                          <Text fw={600} size="md">
                            Document Details
                          </Text>
                        </Group>
                        <Divider my={5} />
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Type:
                          </Text>
                          <Badge size="lg" variant="light" color="blue">
                            {docType}
                          </Badge>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Number:
                          </Text>
                          <Text fw={500}>{maskId(docNumber)}</Text>
                        </Group>
                      </Stack>
                    </Paper>

                    {/* Personal Details Card */}
                    <Paper withBorder p="md" radius="md">
                      <Stack gap="xs">
                        {/* Header (Kept the same) */}
                        <Group gap="xs">
                          <IconUser size={20} />
                          <Text fw={600} size="md">
                            Personal Details
                          </Text>
                        </Group>
                        <Divider my={5} />

                        {/* Full Name Detail (Label-Top, Value-Bottom) */}
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">
                            Full Name:
                          </Text>
                          <Text fw={500}>
                            {firstName} {lastName}
                          </Text>
                        </Stack>

                        {/* Address Detail (Label-Top, Value-Bottom) */}
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                            Address:
                          </Text>
                          <Text fw={500} style={{ wordBreak: "break-word" }}>
                            {fullAddress}
                          </Text>
                        </Stack>

                        {/* FIX: Date of Birth Detail (Label-Top, Value-Bottom) 
        Replaced <Group> with <Stack> to force vertical alignment.
    */}
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">
                            Date of birth:
                          </Text>
                          <Text fw={500}>{formatDobMasked(birthDate)}</Text>
                        </Stack>
                      </Stack>
                    </Paper>
                  </SimpleGrid>

                  <Divider
                    label="Document Images"
                    labelPosition="center"
                    my="md"
                  />

                  {/* Images hidden from user snapshot for privacy */}
                  <Paper withBorder p="lg" radius="md" ta="center">
                    <Text fw={600}>Document images are hidden for privacy</Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      If you need to view or update your documents, contact
                      support or wait for verification.
                    </Text>
                  </Paper>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Container>
      )}

      {/* MODAL FOR ENLARGED PHOTO PREVIEW */}
      <Modal
        opened={opened}
        onClose={close}
        title="Document Preview"
        centered
        size="lg" // Use a larger size for the photo
      >
        {modalImageSrc && (
          <Image
            src={modalImageSrc}
            alt="Enlarged document preview"
            fit="contain"
            mah="80vh" // Max height relative to viewport height
            w="100%"
          />
        )}
      </Modal>

      {/* CONFIRMATION MODAL FOR SUBMIT */}
      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Confirm submission"
        centered
        size="sm"
      >
        <Text>
          Are you sure you want to submit your documents for verification? This
          will send your details to our team for review.
        </Text>

        {/* FIX: Change 'gap="right"' to 'justify="flex-end"' 
      This pushes the buttons to the right (end) of the Group container.
    */}
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              closeConfirm();
              await handleSubmit();
            }}
            loading={submitting}
          >
            Confirm
          </Button>
        </Group>
      </Modal>
    </PrivateMainLayout>
  );
}

// show DOB in snapshot (masked to month+year)
function formatDobMasked(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
}
