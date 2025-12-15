import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WelcomeScreen } from './WelcomeScreen';
import { DeviceConfigScreen } from './DeviceConfigScreen';
import { CompanyAffiliationScreen } from './CompanyAffilationScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';
import { ApprovedScreen } from './ApprobedScreen';

export const OnboardingNavigator = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    email: '',
    deviceInfo: {},
    companyCode: '',
  });

  const handleNext = (data) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleApproved = () => {
    setCurrentStep(4);
  };

  const handleComplete = () => {
    onComplete(onboardingData);
  };

  return (
    <SafeAreaView style={styles.container}>
      {currentStep === 0 && <WelcomeScreen onNext={() => setCurrentStep(1)} />}
      {currentStep === 1 && (
        <DeviceConfigScreen
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
      {currentStep === 2 && (
        <CompanyAffiliationScreen
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
      {currentStep === 3 && (
        <PendingApprovalScreen
          companyCode={onboardingData.companyCode}
          onApproved={handleApproved}
        />
      )}
      {currentStep === 4 && (
        <ApprovedScreen
          email={onboardingData.email}
          companyCode={onboardingData.companyCode}
          onComplete={handleComplete}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});