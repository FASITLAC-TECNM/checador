import { useState, useEffect } from "react";
import WelcomeScreen from "../components/affiliation/WelcomeScreen";
import NodeConfigStep from "../components/affiliation/NodeConfigStep";
import DevicesStep from "../components/affiliation/DevicesStep";
import AffiliationStep from "../components/affiliation/AffiliationStep";
import ApprovalStep from "../components/affiliation/ApprovalStep";

export default function AffiliationRequest() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState(1);
  const [requestStatus, setRequestStatus] = useState("pending");
  const [countdown, setCountdown] = useState(10);

  const [nodeConfig, setNodeConfig] = useState({
    nodeName: "",
    description: "",
    macAddress: "",
    operatingSystem: "",
  });

  const [devices, setDevices] = useState([
    { id: 1, name: "", type: "camera", ip: "", port: "", connection: "IP" },
  ]);

  const [companyId, setCompanyId] = useState("");

  const handleSubmitRequest = () => {
    setStep(4);
    setRequestStatus("pending");
    setCountdown(10);
  };

  const handleRetryRequest = () => {
    setStep(3);
    setRequestStatus("pending");
  };

  useEffect(() => {
    if (step === 4 && requestStatus === "pending" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 4 && countdown === 0 && requestStatus === "pending") {
      setRequestStatus("approved");
    }
  }, [step, countdown, requestStatus]);

  if (showWelcome) {
    return <WelcomeScreen onClose={() => setShowWelcome(false)} />;
  }

  if (step === 1) {
    return (
      <NodeConfigStep
        nodeConfig={nodeConfig}
        setNodeConfig={setNodeConfig}
        onNext={() => setStep(2)}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  if (step === 2) {
    return (
      <DevicesStep
        devices={devices}
        setDevices={setDevices}
        onNext={() => setStep(3)}
        onPrevious={() => setStep(1)}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  if (step === 3) {
    return (
      <AffiliationStep
        companyId={companyId}
        setCompanyId={setCompanyId}
        onSubmit={handleSubmitRequest}
        onPrevious={() => setStep(2)}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  if (step === 4) {
    return (
      <ApprovalStep
        requestStatus={requestStatus}
        companyId={companyId}
        countdown={countdown}
        onRetry={handleRetryRequest}
        onCancel={() => setStep(3)}
        onGoToLogin={() => {
          setStep(1);
          setRequestStatus("pending");
          setCountdown(10);
        }}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  return null;
}
